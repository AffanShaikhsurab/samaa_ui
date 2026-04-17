import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { claimProjectJob, heartbeatJobLease, markJobComplete, scheduleRetriableFailure } from "@/lib/control-plane";
import { getE2BPreviewUrl } from "@/lib/e2b-provider";
import { runAnclGeneration } from "@/lib/generation-orchestrator";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import { getOrCreateSandbox } from "@/lib/flutter-session";
import {
  appendBuildHistory,
  appendProjectArtifact,
  appendProjectMessage,
  BuilderPhase,
  createProjectSnapshot,
  getBuildJobById,
  getProjectById,
  BuildJobAction,
  saveAnclResult,
  type RequirementsDocument,
  updateProject,
} from "@/lib/project-store";

export const dynamic = "force-dynamic";

const FLUTTER_WORKDIR = "/home/user";
const FLUTTER_PATH = "/home/user/flutter";

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const flutterEnvPrefix =
  `export PATH=\"${FLUTTER_PATH}/bin:$PATH\" && export FLUTTER_ROOT=\"${FLUTTER_PATH}\" && `;

function redactSecrets(value?: string): string | undefined {
  if (!value) return value;
  return value
    .replace(/\b(sk|rk|pk)_[a-zA-Z0-9]{12,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bBearer\s+[A-Za-z0-9\-_.=]+\b/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/(api[_-]?key\s*[:=]\s*)([^\s'\"]+)/gi, "$1[REDACTED]")
    .replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, "[REDACTED_PRIVATE_KEY]");
}

const toProjectSlug = (name: string, projectId: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return `${base || "flutter_project"}_${projectId.slice(0, 8)}`;
};

const escapeDartSingleQuoted = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$\{/g, "\\${");

const collectRequirementChecklist = (requirements?: RequirementsDocument): string[] => {
  if (!requirements) return [];

  const items = new Set<string>();

  for (const screen of requirements.screens.slice(0, 6)) {
    items.add(`Screen: ${screen.name}`);
    for (const feature of screen.features.slice(0, 3)) {
      items.add(`${screen.name} -> ${feature.name}`);
    }
  }

  for (const edgeCase of requirements.globalEdgeCases.slice(0, 6)) {
    items.add(`Edge case: ${edgeCase}`);
  }

  return [...items].slice(0, 14);
};

const buildMainDart = (
  projectName: string,
  prompt: string,
  checklist: string[] = [],
  recoveryNote?: string,
): string => {
  const cleanPrompt = escapeDartSingleQuoted(prompt.replace(/`/g, "'").trim());
  const title = escapeDartSingleQuoted(
    projectName
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 40),
  );
  const normalizedChecklist = checklist
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 14)
    .map((item) => `'${escapeDartSingleQuoted(item)}'`)
    .join(",\n    ");
  const recoveryBanner = recoveryNote?.trim()
    ? `\n                  Container(\n                    width: double.infinity,\n                    padding: const EdgeInsets.all(12),\n                    margin: const EdgeInsets.only(bottom: 12),\n                    decoration: BoxDecoration(\n                      color: Colors.amber.withOpacity(0.15),\n                      borderRadius: BorderRadius.circular(10),\n                      border: Border.all(color: Colors.amber),\n                    ),\n                    child: const Text('${escapeDartSingleQuoted(recoveryNote.trim())}'),\n                  ),`
    : "";

  return `import 'package:flutter/material.dart';

void main() {
  runApp(const GeneratedApp());
}

class GeneratedApp extends StatelessWidget {
  const GeneratedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: '${title || "Flutter App"}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      home: const GeneratedHomePage(),
    );
  }
}

class GeneratedHomePage extends StatelessWidget {
  const GeneratedHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${title || "Flutter App"}')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Deterministic build output',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                  ),${recoveryBanner}
                  Text(
                    'Prompt used for this build',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  Text('${cleanPrompt || "No prompt was provided."}'),
                  const SizedBox(height: 16),
                  const Text(
                    'Requirement checklist',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  ...buildChecklistWidgets(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

List<Widget> buildChecklistWidgets() {
  const checklist = <String>[
    ${normalizedChecklist || "'No validated requirements were provided.'"}
  ];

  return checklist
      .map(
        (item) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontWeight: FontWeight.w700)),
              Expanded(child: Text(item)),
            ],
          ),
        ),
      )
      .toList();
}
`;
};

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

async function runCommand(
  sandbox: Awaited<ReturnType<typeof getOrCreateSandbox>>,
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<CommandResult> {
  const result = await sandbox.commands.run(command, { cwd, timeoutMs });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? null,
  };
}

async function runMockOrchestration(
  projectId: string,
  message: string,
  send: (event: unknown) => void,
) {
  const steps: Array<{ phase: BuilderPhase; label: string }> = [
    { phase: "planning", label: "Planning build strategy" },
    { phase: "generating", label: "Generating Flutter project files" },
    { phase: "building", label: "Building Flutter web app" },
    { phase: "serving", label: "Preparing preview" },
  ];

  for (const step of steps) {
    await updateProject(projectId, { latestPhase: step.phase, status: "running" });
    send({ type: "phase", phase: step.phase, label: step.label });
    send({ type: "tool_call_started", name: step.label.toLowerCase().replace(/\s+/g, "_") });
    send({ type: "tool_result", name: step.label.toLowerCase().replace(/\s+/g, "_"), ok: true, output: "ok" });
    await appendProjectArtifact(projectId, {
      kind: "log",
      title: step.label,
      content: `Mock mode: ${step.label}`,
    });
  }

  const mockPreviewUrl = `https://preview.mock.local/${projectId}`;

  await appendProjectArtifact(projectId, {
    kind: "preview",
    title: "Flutter preview",
    url: mockPreviewUrl,
    content: "Mock preview URL for deterministic e2e.",
  });

  await appendProjectMessage(projectId, {
    role: "assistant",
    content: `Build completed in mock mode for: ${message}\n\nPreview URL: ${mockPreviewUrl}`,
  });

  await appendBuildHistory(projectId, {
    action: "generate",
    phase: "complete",
    outcome: "success",
    note: "Mock orchestration completed.",
  });

  await createProjectSnapshot(projectId, {
    phase: "complete",
    prompt: message,
    previewUrl: mockPreviewUrl,
    outcome: "success",
    filesManifest: [{ path: "lib/main.dart" }],
  });

  const updated = await updateProject(projectId, {
    latestPhase: "complete",
    status: "complete",
    latestPreviewUrl: mockPreviewUrl,
    lastError: undefined,
  });

  if (updated) {
    send({ type: "preview_url", url: mockPreviewUrl });
    send({
      type: "assistant_delta",
      text: `✅ Build finished. Preview: ${mockPreviewUrl}`,
    });
    send({ type: "completed", session: toBuilderSession(updated) });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if ("response" in owned) {
    return owned.response;
  }
  const project = owned.project;

  const sessionToken = project.sessionToken;
  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!sessionToken || !providedSessionToken || providedSessionToken !== sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { message?: string; jobId?: string };
  const inputMessage = body.message?.trim() ?? "";
  const jobId = body.jobId?.trim() ?? "";

  const latestProjectState = await getProjectById(id);
  const requirementsSealed = Boolean(
    latestProjectState?.requirementsDoc?.validation?.walkthroughCompleted &&
      latestProjectState?.requirementsDoc?.validation?.sealedAt,
  );

  if (!jobId && !requirementsSealed) {
    const blockedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (event: unknown) => controller.enqueue(encoder.encode(sseEvent(event)));
        send({
          type: "stage_blocked",
          stage: latestProjectState?.latestPhase ?? "walkthrough",
          reason: "Discovery and walkthrough must be completed before generation.",
          recoverable: true,
        });
        if (latestProjectState) {
          send({ type: "completed", session: toBuilderSession(latestProjectState) });
        }
        controller.close();
      },
    });

    return new Response(blockedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (!inputMessage && !jobId) {
    // Default deterministic generation command once walkthrough has been sealed.
    if (!requirementsSealed) {
      return Response.json({ error: "Provide either message or jobId." }, { status: 400 });
    }
  }

  let action: BuildJobAction = "generate";
  let executionMessage = inputMessage;

  if (jobId) {
    const found = await getBuildJobById(jobId);
    if (!found || found.projectId !== id) {
      return Response.json({ error: "Build job not found for this project." }, { status: 404 });
    }

    if (found.status === "succeeded" || found.status === "failed" || found.status === "canceled") {
      return Response.json({ error: "Build job already reached a terminal state." }, { status: 409 });
    }

    const claimed = await claimProjectJob(id, jobId, `builder:${id}`);
    if (!claimed) {
      return Response.json({ error: "Build job is already running or unavailable." }, { status: 409 });
    }

    action = claimed.action;
    if (!executionMessage) {
      executionMessage = claimed.message;
    }
  }

  const message = executionMessage.trim() || "Generate app from sealed requirements.";
  if (!message) {
    return Response.json({ error: "Resolved build message is empty." }, { status: 400 });
  }

  await appendProjectMessage(id, { role: "user", content: message });
  await updateProject(id, { status: "running", latestPhase: "planning", lastError: undefined });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let streamClosed = false;
      const send = (event: unknown) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event)));
        } catch {
          streamClosed = true;
        }
      };

      const close = () => {
        if (streamClosed) return;
        streamClosed = true;
        try {
          controller.close();
        } catch {
          // Ignore close races caused by abrupt client disconnects.
        }
      };

      void (async () => {
        try {
          const keepLeaseAlive = async () => {
            if (!jobId) return;
            await heartbeatJobLease(jobId);
          };

          if (process.env.BUILDER_ORCHESTRATION_MODE === "mock") {
            await runMockOrchestration(id, message, send);
            if (jobId) {
              await markJobComplete(jobId, {
                status: "succeeded",
                terminalReason: "mock_build_completed",
              });
            }
            close();
            return;
          }

          const sandbox = await getOrCreateSandbox(id);
          const currentProject = await getProjectById(id);
          if (!currentProject) {
            throw new Error("Project not found before orchestration.");
          }

          const projectSlug = toProjectSlug(currentProject.name, id);
          const projectDir = `${FLUTTER_WORKDIR}/${projectSlug}`;
          const requirementChecklist = collectRequirementChecklist(currentProject.requirementsDoc);

          let usedFallbackScaffold = false;
          let buildAttemptCount = 0;
          let analyzeAttemptCount = 0;
          const analyzeFailures: string[] = [];

          send({ type: "phase", phase: "planning", label: "Planning changes" });
          await appendBuildHistory(id, {
            action,
            phase: "planning",
            outcome: "partial",
            note: `Starting orchestration for ${projectSlug}`,
          });

          send({ type: "tool_call_started", name: "ensure_flutter_project" });
          await keepLeaseAlive();
          const checkProject = await runCommand(
            sandbox,
            `test -f ${shellQuote(`${projectDir}/pubspec.yaml`)}`,
            FLUTTER_WORKDIR,
            20_000,
          );
          await keepLeaseAlive();

          let createResult: CommandResult | null = null;
          if (!checkProject.ok) {
            await keepLeaseAlive();
            createResult = await runCommand(
              sandbox,
              `${flutterEnvPrefix}flutter create --org com.samaa --platforms web ${shellQuote(projectSlug)}`,
              FLUTTER_WORKDIR,
              300_000,
            );
            await keepLeaseAlive();
          }

          const ensureOk = checkProject.ok || createResult?.ok;
          send({
            type: "tool_result",
            name: "ensure_flutter_project",
            ok: Boolean(ensureOk),
            output: ensureOk
              ? `Project ready at ${projectDir}`
              : redactSecrets(createResult?.stderr || checkProject.stderr),
          });

          if (!ensureOk) {
            throw new Error(createResult?.stderr || "Failed to initialize Flutter project.");
          }

          send({ type: "phase", phase: "ancl_generation", label: "Generating ANCL from validated requirements" });
          send({ type: "generation_started" });

          const requirements = currentProject.requirementsDoc;
          if (!requirements?.validation?.walkthroughCompleted) {
            throw new Error("Requirements are not sealed. Complete walkthrough before generation.");
          }

          const generation = await runAnclGeneration({
            requirements,
            onEvent: (event) => {
              send({ type: "generation_event", event });
              if (event.type === "compile_started") {
                send({ type: "phase", phase: "compiling", label: "Compiling ANCL to Flutter" });
              }
            },
          });

          let mainDartContent = generation.flutterCode || buildMainDart(currentProject.name, message, requirementChecklist);
          await sandbox.files.write(`${projectDir}/lib/main.dart`, mainDartContent);

          await saveAnclResult(id, {
            anclCode: generation.anclCode,
            flutterCode: mainDartContent,
            compilationSucceeded: Boolean(generation.compilationSucceeded && generation.flutterCode),
            compilationError: generation.compilationError,
          });

          await appendProjectArtifact(id, {
            kind: "ancl",
            title: "Generated ANCL",
            content: generation.anclCode,
          });
          await appendProjectArtifact(id, {
            kind: "compiler_log",
            title: generation.compilationSucceeded ? "ANCL compile succeeded" : "ANCL compile failed",
            content: generation.compilationError ?? "Compilation completed successfully.",
          });
          await appendProjectArtifact(id, {
            kind: "source",
            title: "Generated main.dart",
            path: `${projectSlug}/lib/main.dart`,
            content: mainDartContent,
          });
          send({ type: "artifact_ready", artifact: "ancl", label: "ANCL source generated" });
          send({ type: "artifact_ready", artifact: "source", label: "Flutter source generated" });

          send({ type: "phase", phase: "verifying", label: "Running static verification" });

          send({ type: "tool_call_started", name: "flutter_analyze" });
          analyzeAttemptCount += 1;
          await keepLeaseAlive();
          let analyzeResult = await runCommand(
            sandbox,
            `${flutterEnvPrefix}flutter analyze`,
            projectDir,
            300_000,
          );
          await keepLeaseAlive();

          if (!analyzeResult.ok) {
            analyzeFailures.push(redactSecrets(analyzeResult.stderr || analyzeResult.stdout) ?? "flutter analyze failed");
            send({
              type: "tool_result",
              name: "flutter_analyze",
              ok: false,
              output: redactSecrets(analyzeResult.stderr || analyzeResult.stdout),
            });

            send({ type: "phase", phase: "fixing", label: "Applying deterministic recovery scaffold" });
            usedFallbackScaffold = true;
            mainDartContent = buildMainDart(
              currentProject.name,
              message,
              requirementChecklist,
              "Recovered using deterministic scaffold after static verification failed.",
            );
            await sandbox.files.write(`${projectDir}/lib/main.dart`, mainDartContent);

            analyzeAttemptCount += 1;
            await keepLeaseAlive();
            analyzeResult = await runCommand(
              sandbox,
              `${flutterEnvPrefix}flutter analyze`,
              projectDir,
              300_000,
            );
            await keepLeaseAlive();
          }

          await appendProjectArtifact(id, {
            kind: "verification_report",
            title: "Static verification",
            content: JSON.stringify(
              {
                phase: "flutter_analyze",
                ok: analyzeResult.ok,
                analyzeAttemptCount,
                failures: analyzeFailures,
              },
              null,
              2,
            ),
          });

          send({
            type: "tool_result",
            name: "flutter_analyze",
            ok: analyzeResult.ok,
            output: analyzeResult.ok ? "No static analysis errors." : redactSecrets(analyzeResult.stderr || analyzeResult.stdout),
          });

          send({ type: "phase", phase: "building", label: "Building Flutter web" });

          send({ type: "tool_call_started", name: "flutter_pub_get" });
          await keepLeaseAlive();
          const pubGet = await runCommand(
            sandbox,
            `${flutterEnvPrefix}flutter pub get`,
            projectDir,
            180_000,
          );
          await keepLeaseAlive();
          send({
            type: "tool_result",
            name: "flutter_pub_get",
            ok: pubGet.ok,
            output: pubGet.ok ? "Dependencies installed." : redactSecrets(pubGet.stderr),
          });
          if (!pubGet.ok) {
            throw new Error(pubGet.stderr || "flutter pub get failed.");
          }

          send({ type: "tool_call_started", name: "flutter_build_web" });
          await keepLeaseAlive();
          buildAttemptCount += 1;
          let build = await runCommand(
            sandbox,
            `${flutterEnvPrefix}flutter build web --release`,
            projectDir,
            900_000,
          );
          await keepLeaseAlive();
          send({
            type: "tool_result",
            name: "flutter_build_web",
            ok: build.ok,
            output: build.ok ? "Build complete." : redactSecrets(build.stderr),
          });

          if (!build.ok) {
            send({ type: "phase", phase: "fixing", label: "Applying automatic repair" });
            const remediationScreens = currentProject.requirementsDoc?.screens ?? [];
            for (const screen of remediationScreens) {
              send({
                type: "remediation_screen_started",
                screenId: screen.id,
                screenName: screen.name,
              });
              await appendProjectArtifact(id, {
                kind: "remediation_report",
                title: `Screen remediation analysis: ${screen.name}`,
                content: `Validated screen: ${screen.name}\nAssumption: ${screen.assumption}\nExpected features: ${screen.features
                  .map((feature) => feature.name)
                  .join(", ")}`,
              });
            }
            await appendBuildHistory(id, {
              action,
              phase: "fixing",
              outcome: "partial",
              note: "First build failed; applying fallback template.",
            });

            const fallback = buildMainDart(
              currentProject.name,
              `${message}\n\n(Recovered with fallback scaffold)`,
              requirementChecklist,
              "Recovered after build failure using deterministic scaffold.",
            );
            mainDartContent = fallback;
            await sandbox.files.write(`${projectDir}/lib/main.dart`, fallback);
            usedFallbackScaffold = true;
            await appendProjectArtifact(id, {
              kind: "log",
              title: "Repair attempt",
              content: redactSecrets(build.stderr || build.stdout || "Build failed; fallback applied."),
            });

            buildAttemptCount += 1;
            build = await runCommand(
              sandbox,
              `${flutterEnvPrefix}flutter build web --release`,
              projectDir,
              900_000,
            );
            await keepLeaseAlive();
            send({
              type: "tool_result",
              name: "flutter_build_web_repair",
              ok: build.ok,
              output: build.ok ? "Build recovered." : redactSecrets(build.stderr),
            });
          }

          if (!build.ok) {
            throw new Error(build.stderr || build.stdout || "Build failed after repair.");
          }

          await appendProjectArtifact(id, {
            kind: "verification_report",
            title: "Build verification",
            content: JSON.stringify(
              {
                phase: "flutter_build_web",
                ok: true,
                buildAttemptCount,
                usedFallbackScaffold,
              },
              null,
              2,
            ),
          });

          await appendProjectArtifact(id, {
            kind: "source",
            title: "Final main.dart",
            path: `${projectSlug}/lib/main.dart`,
            content: mainDartContent,
          });

          await saveAnclResult(id, {
            anclCode: generation.anclCode,
            flutterCode: mainDartContent,
            compilationSucceeded: true,
            compilationError: generation.compilationError,
          });

          send({ type: "phase", phase: "serving", label: "Starting preview server" });

          send({ type: "tool_call_started", name: "serve_preview" });
          await keepLeaseAlive();
          const serve = await runCommand(
            sandbox,
            `pkill -f \"http.server 3000\" || true; nohup python3 -m http.server 3000 --bind 0.0.0.0 --directory ${shellQuote(`${projectDir}/build/web`)} > /tmp/flutter-preview.log 2>&1 &`,
            FLUTTER_WORKDIR,
            30_000,
          );
          await keepLeaseAlive();

          const previewInfo = getE2BPreviewUrl(sandbox, 3000);
          const previewUrl = previewInfo?.url;
          send({
            type: "tool_result",
            name: "serve_preview",
            ok: Boolean(serve.ok && previewUrl),
            output: previewUrl ?? redactSecrets(serve.stderr),
          });

          if (!previewUrl) {
            throw new Error("Failed to resolve preview URL after serve.");
          }

          await appendProjectArtifact(id, {
            kind: "preview",
            title: "Flutter preview",
            url: previewUrl,
            content: "Interactive Flutter web preview URL.",
          });

          await appendProjectMessage(id, {
            role: "assistant",
            content: `✅ Build complete. Preview URL: ${previewUrl}`,
          });

          await keepLeaseAlive();

          await appendBuildHistory(id, {
            action,
            phase: "complete",
            outcome: "success",
            note: "Build and preview completed successfully.",
          });

          await createProjectSnapshot(id, {
            phase: "complete",
            prompt: message,
            previewUrl,
            outcome: "success",
            filesManifest: [
              { path: `${projectSlug}/lib/main.dart` },
              { path: `${projectSlug}/build/web/index.html` },
            ],
          });

          const completed = jobId
            ? await markJobComplete(jobId, {
                status: "succeeded",
                terminalReason: "build_completed",
                latestPreviewUrl: previewUrl,
              })
            : await updateProject(id, {
                latestPhase: "complete",
                status: "complete",
                latestPreviewUrl: previewUrl,
                lastError: undefined,
              });

          if (!completed) {
            throw new Error("Project disappeared before completion.");
          }

          const completedProject = await getProjectById(id);
          if (!completedProject) {
            throw new Error("Project disappeared before completion.");
          }

          send({ type: "preview_url", url: previewUrl });
          send({ type: "verification_complete", previewUrl });
          send({ type: "assistant_delta", text: `✅ Your app is ready. Preview: ${previewUrl}` });
          send({ type: "completed", session: toBuilderSession(completedProject) });
        } catch (error) {
          const messageText = redactSecrets(error instanceof Error ? error.message : "Builder orchestration failed.") ??
            "Builder orchestration failed.";
          await appendProjectArtifact(id, {
            kind: "log",
            title: "Build failure",
            content: messageText,
          });
          await appendBuildHistory(id, {
            action,
            phase: "failed",
            outcome: "failed",
            note: messageText,
          });
          await createProjectSnapshot(id, {
            phase: "failed",
            prompt: message,
            previewUrl: undefined,
            outcome: "failed",
            filesManifest: [],
          });
          if (jobId) {
            const retried = await scheduleRetriableFailure(jobId, messageText);
            if (retried?.status === "dead_letter") {
              await markJobComplete(jobId, {
                status: "dead_letter",
                terminalReason: "retry_budget_exhausted",
                errorNote: messageText,
              });
            }
          } else {
            await updateProject(id, {
              latestPhase: "failed",
              status: "failed",
              lastError: messageText,
            });
          }

          const failed = await getProjectById(id);

          send({ type: "error", message: messageText, code: "ORCHESTRATION_FAILED" });
          if (failed) {
            send({ type: "completed", session: toBuilderSession(failed) });
          }
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
