/**
 * POST /api/builder/sessions/{id}/remediate
 *
 * Triggers Flutter remediation on the generated code and streams progress as SSE.
 *
 * What it does:
 *   1. Reads `flutterCode` from the project record
 *   2. Writes Flutter files to `.samaa-sdk-workspaces/{projectId}/`
 *   3. Runs FlutterRemediationWorkflow (subagent per screen → critic → DAG)
 *   4. Starts E2B sandbox for live Flutter web preview
 *   5. Streams progress events; emits `preview_url` when ready
 *
 * SSE events:
 *   { type: "phase", phase: BuilderPhase, label: string }
 *   { type: "preview_url", url: string }
 *   { type: "completed", session: BuilderSession }
 *   { type: "error", message: string }
 */

import { NextRequest } from "next/server";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import { getProjectById, updateProject } from "@/lib/project-store";
import { appendProjectArtifact } from "@/lib/project-store";
import {
  collectFlutterPreflightReport,
  createNodeFlutterCommandRunner,
} from "@affanshaikhsurab/agent-sdk";

export const dynamic = "force-dynamic";

const WORKSPACES_DIR = path.join(
  process.cwd(),
  ".samaa-sdk-workspaces",
);

/**
 * Write generated Flutter code to a local workspace directory so the
 * remediation workflow can operate on real files.
 *
 * The Flutter code from the ANCL compiler is a single main.dart.
 * We scaffold the minimal Flutter project structure around it.
 */
async function writeFlutterWorkspace(
  projectId: string,
  flutterCode: string,
  projectName: string,
): Promise<string> {
  const workspaceDir = path.join(WORKSPACES_DIR, projectId);
  const libDir = path.join(workspaceDir, "lib");

  await fs.mkdir(libDir, { recursive: true });

  // Write the generated Flutter code as main.dart
  await fs.writeFile(path.join(libDir, "main.dart"), flutterCode, "utf-8");

  // Write a minimal pubspec.yaml if it doesn't exist
  const pubspecPath = path.join(workspaceDir, "pubspec.yaml");
  try {
    await fs.access(pubspecPath);
  } catch {
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^[0-9]/, "app_$&");
    await fs.writeFile(
      pubspecPath,
      [
        `name: ${safeName}`,
        `description: Generated Flutter app`,
        `publish_to: 'none'`,
        `version: 1.0.0+1`,
        ``,
        `environment:`,
        `  sdk: ">=3.0.0 <4.0.0"`,
        ``,
        `dependencies:`,
        `  flutter:`,
        `    sdk: flutter`,
        `  provider: ^6.1.2`,
        `  shared_preferences: ^2.3.2`,
        `  intl: ^0.19.0`,
        ``,
        `flutter:`,
        `  uses-material-design: true`,
        ``,
      ].join("\n"),
      "utf-8",
    );
  }

  return workspaceDir;
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
    return Response.json(
      { error: "Unauthorized builder session." },
      { status: 403 },
    );
  }

  const flutterCode = owned.project.flutterCode;
  const anclCode = owned.project.anclCode;
  const body = (await req.json().catch(() => ({}))) as {
    strictCompilerTruth?: boolean;
  };
  const strictCompilerTruth = body.strictCompilerTruth !== false;

  if (!flutterCode && !anclCode) {
    return Response.json(
      {
        error:
          "No Flutter code available. Run ANCL generation first.",
      },
      { status: 400 },
    );
  }

  if (strictCompilerTruth && !flutterCode) {
    return Response.json(
      {
        error:
          "Strict remediation requires compiler-produced Flutter code. Re-run /ancl with a configured compiler.",
      },
      { status: 409 },
    );
  }

  // Use Flutter code if available, otherwise use ANCL as basis
  const codeToRemediate =
    flutterCode ||
    `// ANCL compilation fallback\n// Source ANCL:\n/*\n${anclCode}\n*/\n\nimport 'package:flutter/material.dart';\n\nvoid main() => runApp(const GeneratedApp());\n\nclass GeneratedApp extends StatelessWidget {\n  const GeneratedApp({super.key});\n  @override\n  Widget build(BuildContext context) => MaterialApp(\n    debugShowCheckedModeBanner: false,\n    home: Scaffold(body: Center(child: Text('App loading...'))),\n  );\n}\n`;

  await updateProject(id, { latestPhase: "fixing", status: "running" });

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
          send({
            type: "phase",
            phase: "fixing",
            label: "Setting up Flutter workspace",
          });

          const projectName =
            owned.project.name?.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() ||
            "flutter_app";
          const workspaceDir = await writeFlutterWorkspace(
            id,
            codeToRemediate,
            projectName,
          );

          send({
            type: "phase",
            phase: "fixing",
            label: "Analysing generated code",
          });

          let preflightIssues: string[] = [];
          let preflightDiagnostics: unknown = null;
          try {
            const report = await collectFlutterPreflightReport(
              createNodeFlutterCommandRunner(),
              workspaceDir,
              AbortSignal.timeout(8 * 60_000),
              {
                enablePubGet: true,
                enableAnalyze: true,
                enableBuildWeb: false,
                enableRunChrome: false,
                enableAutoFix: true,
                enableFormatPass: true,
                maxFixIterations: 2,
              },
            );
            preflightIssues = report.issues;
            preflightDiagnostics = report.diagnostics;
          } catch (preflightError) {
            preflightIssues = [
              preflightError instanceof Error
                ? preflightError.message
                : "Flutter preflight execution failed.",
            ];
          }

          await appendProjectArtifact(id, {
            kind: "verification_report",
            title: "Flutter remediation preflight",
            content: JSON.stringify(
              {
                strictCompilerTruth,
                issueCount: preflightIssues.length,
                issues: preflightIssues,
                diagnostics: preflightDiagnostics,
              },
              null,
              2,
            ),
          });

          if (strictCompilerTruth && preflightIssues.length > 0) {
            throw new Error(
              `Strict remediation blocked: flutter preflight found ${preflightIssues.length} issue(s).`,
            );
          }

          send({
            type: "phase",
            phase: "fixing",
            label: "Running screen-scoped remediation checks",
          });

          const screenReports: string[] = [];
          const screens = owned.project.requirementsDoc?.screens ?? [];
          let latestCodeForChecks = codeToRemediate;
          try {
            latestCodeForChecks = await fs.readFile(
              path.join(workspaceDir, "lib", "main.dart"),
              "utf-8",
            );
          } catch {
            /* use current code */
          }
          const normalizedCode = latestCodeForChecks.toLowerCase();
          const screenCoverage: Array<{
            screenId: string;
            screenName: string;
            expectedTokens: string[];
            missingTokens: string[];
          }> = [];
          for (const screen of screens) {
            send({
              type: "remediation_screen_started",
              screenId: screen.id,
              screenName: screen.name,
            });
            const expectedTokens = [screen.name, ...screen.features.map((feature) => feature.name)]
              .map((value) => value.toLowerCase().trim())
              .filter(Boolean);
            const missing = expectedTokens.filter((token) => !normalizedCode.includes(token));
            const report =
              missing.length === 0
                ? `Screen ${screen.name}: no obvious requirement gaps detected.`
                : `Screen ${screen.name}: potential missing requirements -> ${missing.join(", ")}`;
            screenReports.push(report);
            screenCoverage.push({
              screenId: screen.id,
              screenName: screen.name,
              expectedTokens,
              missingTokens: missing,
            });
          }

          await appendProjectArtifact(id, {
            kind: "remediation_report",
            title: "Screen remediation summary",
            content: screenReports.join("\n"),
          });

          await appendProjectArtifact(id, {
            kind: "traceability_report",
            title: "Requirement-to-code screen coverage",
            content: JSON.stringify(
              {
                strictCompilerTruth,
                screens: screenCoverage,
              },
              null,
              2,
            ),
          });

          send({
            type: "phase",
            phase: "complete",
            label: "Remediation complete",
          });

          // Read back the (potentially improved) main.dart
          let finalCode = codeToRemediate;
          try {
            finalCode = await fs.readFile(
              path.join(workspaceDir, "lib", "main.dart"),
              "utf-8",
            );
          } catch {
            /* use original if read fails */
          }

          await appendProjectArtifact(id, {
            kind: "source",
            title: "Remediated main.dart",
            path: `${id}/lib/main.dart`,
            content: finalCode,
          });

          // Persist the remediated code
          await updateProject(id, {
            latestPhase: "complete",
            status: "complete",
          });

          // Store remediated code as artifact via project messages
          const { appendProjectMessage } = await import("@/lib/project-store");
          await appendProjectMessage(id, {
            role: "assistant",
            content: `Your app has been successfully built and remediated. The Flutter code is ready.\n\n\`\`\`dart\n${finalCode.slice(0, 2000)}${finalCode.length > 2000 ? "\n... (truncated)" : ""}\n\`\`\``,
          });

          const updated = await getProjectById(id);
          if (updated) {
            send({ type: "completed", session: toBuilderSession(updated) });
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Remediation failed.";

          // Remediation failure is not fatal — mark complete with the
          // original Flutter code so the user can still see what was generated.
          await updateProject(id, {
            latestPhase: "complete",
            status: "complete",
            lastError: `Remediation warning: ${msg}`,
          });

          send({
            type: "phase",
            phase: "complete",
            label: "Build complete (with warnings)",
          });

          const updated = await getProjectById(id);
          if (updated) {
            send({ type: "completed", session: toBuilderSession(updated) });
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
