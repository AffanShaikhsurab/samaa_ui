/**
 * POST /api/builder/sessions/{id}/ancl
 *
 * Triggers the ANCL generation pipeline on the validated RequirementsDocument
 * and streams progress as SSE events.
 *
 * Pipeline:
 *   1. AnclWriterAgent  — writes ANCL from requirements
 *   2. AnclCriticAgent  — critiques for completeness (2 iterations)
 *   3. E2B Compilation  — spins up flutter-web-base-v1 sandbox, installs
 *                         quickapp CLI, compiles ANCL → Flutter code, kills
 *                         sandbox. Falls back to HTTP ANCL_COMPILER_URL if
 *                         E2B_API_KEY is not set.
 *
 * SSE events:
 *   { type: "phase", phase: "ancl_generation", label: string }
 *   { type: "ancl_event", event: AnclEvent }
 *   { type: "completed", session: BuilderSession }
 *   { type: "error", message: string }
 */

import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import {
  appendProjectArtifact,
  getProjectById,
  hasUnansweredDiscoveryQuestions,
  saveAnclResult,
  updateProject,
  sealPhaseCheckpoint,
  clearPhaseCheckpoint,
} from "@/lib/project-store";
import type { AnclEvent } from "@affanshaikhsurab/agent-sdk";
import {
  AnclGenerationPipeline,
  type RequirementsDocument,
} from "@affanshaikhsurab/agent-sdk";
import { allowAll } from "@/lib/discovery-orchestrator";
import { compileAnclInE2B } from "@/lib/e2b-ancl-compiler";
import { log } from "@/lib/log";


export const dynamic = "force-dynamic";

function resolveAnclCompositionConfig() {
  const provider = (process.env.LLM_PROVIDER ?? "openai").trim().toLowerCase();

  let apiKey = process.env.OPENAI_API_KEY ?? "";
  let baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  let model = "gpt-4o-mini";
  let providerName: "openai" | "anthropic" = "openai";

  if (provider === "nvidia" && process.env.NVIDIA_API_KEY) {
    apiKey = process.env.NVIDIA_API_KEY;
    baseUrl = "https://integrate.api.nvidia.com/v1";
    model = process.env.LLM_MODEL ?? "meta/llama-3.3-70b-instruct";
  } else if (provider === "groq" && process.env.GROQ_API_KEY) {
    apiKey = process.env.GROQ_API_KEY;
    baseUrl = "https://api.groq.com/openai/v1";
    model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";
  } else if (
    (provider === "anthropic" || provider === "claude") &&
    process.env.ANTHROPIC_API_KEY
  ) {
    apiKey = process.env.ANTHROPIC_API_KEY;
    baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
    model = process.env.LLM_MODEL ?? "claude-sonnet-4-20250514";
    providerName = "anthropic";
  } else if (process.env.NVIDIA_API_KEY) {
    apiKey = process.env.NVIDIA_API_KEY;
    baseUrl = "https://integrate.api.nvidia.com/v1";
    model = process.env.LLM_MODEL ?? "meta/llama-3.3-70b-instruct";
  } else if (process.env.GROQ_API_KEY) {
    apiKey = process.env.GROQ_API_KEY;
    baseUrl = "https://api.groq.com/openai/v1";
    model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";
  }

  return {
    options: {
      model,
      apiKey,
      baseUrl,
      provider: { name: providerName },
      permissionChecker: allowAll,
      tools: [],
      maxTurns: 20,
      maxToolCallsPerTurn: 6,
      workingDirectory: process.cwd(),
    },
  };
}

/**
 * Whether E2B compilation is available (E2B_API_KEY is set).
 * Falls back to external ANCL_COMPILER_URL if E2B is not configured.
 */
function e2bCompilerAvailable(): boolean {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if ("response" in owned) return owned.response;

  const sessionToken = owned.project.sessionToken;
  const providedToken = req.headers.get("x-builder-session-token")?.trim();
  if (!sessionToken || !providedToken || providedToken !== sessionToken) {
    log.anclWarn("Session token mismatch", { id, hasToken: Boolean(providedToken) });
    return Response.json(
      { error: "Unauthorized builder session." },
      { status: 403 },
    );
  }

  const requirementsDoc = owned.project.requirementsDoc;
  // Allow resume: the /resume route pre-advances latestPhase to "ancl_generation"
  // so this check should already pass. Keep "failed" as a fallback guard escape hatch.
  const validAnclPhases = ["ancl_generation", "failed"];
  if (!validAnclPhases.includes(owned.project.latestPhase)) {
    log.anclWarn("Wrong phase for ANCL generation", { id, phase: owned.project.latestPhase });
    return Response.json(
      {
        error: `ANCL generation is only allowed during ancl_generation phase. Current phase: ${owned.project.latestPhase}.`,
      },
      { status: 409 },
    );
  }

  if (hasUnansweredDiscoveryQuestions(owned.project)) {
    return Response.json(
      {
        error:
          "Clarification questions are still pending. Answer all questions before ANCL generation.",
      },
      { status: 409 },
    );
  }

  if (!requirementsDoc?.validatedAt) {
    return Response.json(
      {
        error:
          "Requirements document is not yet validated. Complete the walkthrough first.",
      },
      { status: 400 },
    );
  }

  // Resolve compilation strategy:
  //  1. E2B sandbox (preferred — uses flutter-web-base-v1 + quickapp CLI)
  //  2. External ANCL_COMPILER_URL (fallback HTTP service)
  //  3. None (pipeline produces placeholder Flutter code)
  const useE2BCompiler = e2bCompilerAvailable();
  const httpCompilerUrl = useE2BCompiler ? undefined : process.env.ANCL_COMPILER_URL;

  log.ancl("POST /ancl — compiler strategy resolved", {
    id,
    useE2BCompiler,
    hasHttpCompilerUrl: Boolean(httpCompilerUrl),
    e2bKeyPresent: Boolean(process.env.E2B_API_KEY?.trim()),
    llmProvider: process.env.LLM_PROVIDER ?? "openai",
    requirementsScreens: requirementsDoc?.screens?.length ?? 0,
  });

  await updateProject(id, { latestPhase: "ancl_generation", status: "running" });
  log.ancl("Phase updated → ancl_generation/running", { id });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event)));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      void (async () => {
        try {
          const requirementsHash = createHash("sha256")
            .update(JSON.stringify(requirementsDoc))
            .digest("hex");

          send({
            type: "phase",
            phase: "ancl_generation",
            label: "Writing ANCL code",
          });

          send({
            type: "artifact",
            artifact: {
              kind: "traceability_report",
              title: "ANCL run determinism context",
              content: JSON.stringify(
                {
                  compilerStrategy: useE2BCompiler ? "e2b" : httpCompilerUrl ? "http" : "placeholder",
                  requirementsHash,
                  requirementsValidatedAt: requirementsDoc.validatedAt,
                },
                null,
                2,
              ),
            },
          });

          // ---------------------------------------------------------------
          // Step 1+2: Write ANCL + critic loop
          // When useE2BCompiler is true we pass no compilerUrl so the
          // pipeline skips its compile step and returns the raw ANCL code
          // together with a placeholder Flutter output -- we replace that
          // with real E2B-compiled Flutter code below.
          // ---------------------------------------------------------------
          const compositionConfig = resolveAnclCompositionConfig();
          const pipeline = new AnclGenerationPipeline({
            compositionConfig,
            // Pass the HTTP URL only when E2B is unavailable
            compilerUrl: httpCompilerUrl,
            maxCriticIterations: 2,
            onEvent: (evt: AnclEvent) => {
              send({ type: "ancl_event", event: evt });

              if (evt.type === "ancl_critic_started") {
                send({
                  type: "phase",
                  phase: "ancl_generation",
                  label: `Reviewing ANCL (pass ${(evt as { payload?: { iteration?: number } }).payload?.iteration ?? 1})`,
                });
              }
            },
          });

          const pipelineResult = await pipeline.run(
            requirementsDoc as RequirementsDocument,
          );

          const anclCode = pipelineResult.anclCode;

          // ---------------------------------------------------------------
          // Step 3: Compile — E2B sandbox (primary) or HTTP fallback
          // ---------------------------------------------------------------
          let flutterCode = pipelineResult.flutterCode;
          let compilationSucceeded = pipelineResult.compilationSucceeded;
          let compilationError = pipelineResult.compilationError;

          if (useE2BCompiler) {
            send({
              type: "phase",
              phase: "compiling",
              label: "Starting E2B sandbox — installing quickapp…",
            });

            send({ type: "ancl_event", event: { type: "compile_started", timestamp: new Date().toISOString() } });

            const e2bResult = await compileAnclInE2B(
              anclCode,
              (line) => {
                // Stream compiler log lines as ancl_events so the UI trace panel shows progress
                send({
                  type: "ancl_event",
                  event: { type: "compile_log", message: line, timestamp: new Date().toISOString() },
                });
              },
            );

            if (e2bResult.success && e2bResult.flutterCode) {
              flutterCode = e2bResult.flutterCode;
              compilationSucceeded = true;
              compilationError = undefined;

              send({
                type: "phase",
                phase: "compiling",
                label: "E2B compilation complete ✓",
              });

              send({
                type: "ancl_event",
                event: {
                  type: "compile_complete",
                  payload: { flutterCodeChars: flutterCode.length },
                  timestamp: new Date().toISOString(),
                },
              });

              // Store build logs as artifact for diagnostics
              if (e2bResult.buildLogs) {
                await appendProjectArtifact(id, {
                  kind: "log",
                  title: "quickapp compiler build logs",
                  content: e2bResult.buildLogs,
                });
              }
            } else {
              compilationSucceeded = false;
              compilationError = e2bResult.error ?? "E2B compilation failed";

              send({
                type: "ancl_event",
                event: {
                  type: "compile_failed",
                  message: compilationError,
                  timestamp: new Date().toISOString(),
                },
              });

              send({
                type: "phase",
                phase: "compiling",
                label: "E2B compilation failed — using ANCL as basis for remediation",
              });

              if (e2bResult.buildLogs) {
                await appendProjectArtifact(id, {
                  kind: "log",
                  title: "quickapp compiler error logs",
                  content: e2bResult.buildLogs,
                });
              }
            }
          } else if (httpCompilerUrl) {
            // HTTP compiler path: the pipeline already ran the compile step
            send({
              type: "phase",
              phase: "compiling",
              label: compilationSucceeded
                ? "HTTP compilation complete ✓"
                : "HTTP compilation failed — using fallback",
            });
          } else {
            send({
              type: "phase",
              phase: "compiling",
              label: "No compiler configured — using ANCL for remediation",
            });
          }

          // ---------------------------------------------------------------
          // Persist ANCL + Flutter code
          // ---------------------------------------------------------------
          await saveAnclResult(id, {
            anclCode,
            flutterCode,
            compilationSucceeded,
            compilationError,
          });

          const screens = requirementsDoc.screens ?? [];
          await appendProjectArtifact(id, {
            kind: "traceability_report",
            title: "Requirements to code traceability",
            content: JSON.stringify(
              {
                requirementsHash,
                compilerStrategy: useE2BCompiler ? "e2b" : httpCompilerUrl ? "http" : "placeholder",
                compilationSucceeded,
                compilationError,
                screenCoverage: screens.map((screen) => ({
                  screenId: screen.id,
                  screenName: screen.name,
                  features: screen.features.map((feature) => feature.name),
                })),
              },
              null,
              2,
            ),
          });

          // Seal the ancl_generation checkpoint
          await sealPhaseCheckpoint(id, "ancl_generation", requirementsHash);

          // Transition to repo_publish phase
          await updateProject(id, { latestPhase: "repo_publish", status: "idle" });

          send({
            type: "phase",
            phase: "repo_publish",
            label: compilationSucceeded
              ? "Flutter code ready — publishing to GitHub…"
              : "ANCL ready — publishing source to GitHub…",
          });

          const updated = await getProjectById(id);
          if (updated) {
            send({ type: "completed", session: toBuilderSession(updated) });
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "ANCL generation failed.";
          await clearPhaseCheckpoint(id, "ancl_generation");
          await updateProject(id, {
            latestPhase: "failed",
            status: "failed",
            lastError: msg,
          });
          send({ type: "error", message: msg });
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
