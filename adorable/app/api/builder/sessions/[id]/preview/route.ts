/**
 * POST /api/builder/sessions/{id}/preview
 *
 * Spins up an E2B sandbox, clones the project GitHub repository, builds the
 * Flutter web app, and starts a static HTTP server so the user can preview
 * the generated app live.
 *
 * Pipeline:
 *   1. Create E2B sandbox (flutter-web-base-v1 template)
 *   2. git clone the project's GitHub repo into /home/user/{projectId}
 *   3. Run `flutter pub get`
 *   4. Run `flutter build web --release`
 *   5. Serve build/web via Python HTTP server on port 3000
 *   6. Get E2B preview URL and persist to project store
 *
 * The sandbox is kept alive (not killed) so the preview URL remains active.
 * The sandboxId is stored in the project for later cleanup or re-attachment.
 *
 * SSE events:
 *   { type: "phase", phase: "preview_ready", label: string }
 *   { type: "preview_url", url: string }
 *   { type: "completed", session: BuilderSession }
 *   { type: "error", message: string }
 */

import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import { getProjectById, updateProject } from "@/lib/project-store";
import { getE2BPreviewUrl } from "@/lib/e2b-provider";
import {
  createFlutterSandbox,
} from "@/lib/flutter-builder";
import type { E2BFlutterVm } from "@/lib/flutter-builder";

export const dynamic = "force-dynamic";

const FLUTTER_ENV =
  `export PATH="/home/user/flutter/bin:$PATH" && ` +
  `export FLUTTER_ROOT="/home/user/flutter" && `;

const PREVIEW_PORT = 3000;

/** Run a shell command inside the E2B sandbox. Returns true on success. */
async function exec(
  sandbox: E2BFlutterVm,
  command: string,
  cwd: string,
  timeoutMs = 120_000,
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const result = await sandbox.commands.run(command, { cwd, timeoutMs });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
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

  if (owned.project.latestPhase !== "preview_ready") {
    return Response.json(
      {
        error: `Preview is only allowed during preview_ready phase. Current phase: ${owned.project.latestPhase}.`,
      },
      { status: 409 },
    );
  }

  const githubRepositoryUrl = owned.project.githubRepositoryUrl;
  if (!githubRepositoryUrl) {
    return Response.json(
      { error: "No GitHub repository URL found. Run /publish first." },
      { status: 400 },
    );
  }

  await updateProject(id, { latestPhase: "preview_ready", status: "running" });

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
        let sandbox: E2BFlutterVm | null = null;

        try {
          // ----------------------------------------------------------------
          // Step 1: Create E2B sandbox
          // ----------------------------------------------------------------
          send({
            type: "phase",
            phase: "preview_ready",
            label: "Spinning up E2B sandbox…",
          });

          sandbox = await createFlutterSandbox();
          const projectDir = `/home/user/${id}`;

          // ----------------------------------------------------------------
          // Step 2: Clone the GitHub repo
          // ----------------------------------------------------------------
          send({
            type: "phase",
            phase: "preview_ready",
            label: "Cloning project from GitHub…",
          });

          // Build the authenticated clone URL using the GITHUB_TOKEN
          const token = process.env.GITHUB_TOKEN?.trim();
          const cloneUrl = token
            ? githubRepositoryUrl.replace(
                "https://github.com/",
                `https://${token}:x-oauth-basic@github.com/`,
              )
            : githubRepositoryUrl;

          const cloneResult = await exec(
            sandbox,
            `git clone --depth 1 ${cloneUrl} ${projectDir}`,
            "/home/user",
            180_000,
          );

          if (!cloneResult.ok) {
            throw new Error(
              `git clone failed: ${cloneResult.stderr || cloneResult.stdout}`,
            );
          }

          // ----------------------------------------------------------------
          // Step 3: flutter pub get
          // ----------------------------------------------------------------
          send({
            type: "phase",
            phase: "preview_ready",
            label: "Installing Flutter dependencies…",
          });

          const pubResult = await exec(
            sandbox,
            `${FLUTTER_ENV}flutter pub get`,
            projectDir,
            180_000,
          );

          if (!pubResult.ok) {
            throw new Error(
              `flutter pub get failed: ${pubResult.stderr || pubResult.stdout}`,
            );
          }

          // ----------------------------------------------------------------
          // Step 4: flutter build web
          // ----------------------------------------------------------------
          send({
            type: "phase",
            phase: "preview_ready",
            label: "Building Flutter web app…",
          });

          const buildResult = await exec(
            sandbox,
            `${FLUTTER_ENV}flutter build web --release`,
            projectDir,
            900_000,
          );

          if (!buildResult.ok) {
            throw new Error(
              `flutter build web failed: ${buildResult.stderr || buildResult.stdout}`,
            );
          }

          // ----------------------------------------------------------------
          // Step 5: Serve build/web on port PREVIEW_PORT
          // ----------------------------------------------------------------
          send({
            type: "phase",
            phase: "preview_ready",
            label: "Starting preview server…",
          });

          const buildDir = `${projectDir}/build/web`;

          // Start Python HTTP server in the background (non-blocking)
          await sandbox.commands.run(
            `nohup python3 -m http.server ${PREVIEW_PORT} --bind 0.0.0.0 --directory ${buildDir} &`,
            { cwd: buildDir, timeoutMs: 10_000 },
          ).catch(() => {
            // nohup exits immediately, may throw — that's expected
          });

          // Give the server a moment to bind
          await new Promise((r) => setTimeout(r, 2000));

          // ----------------------------------------------------------------
          // Step 6: Get E2B preview URL
          // ----------------------------------------------------------------
          const previewInfo = getE2BPreviewUrl(sandbox, PREVIEW_PORT);
          if (!previewInfo?.url) {
            throw new Error("Failed to get E2B preview URL.");
          }

          const previewUrl = previewInfo.url;

          // ----------------------------------------------------------------
          // Persist preview URL + advance phase
          // ----------------------------------------------------------------
          await updateProject(id, {
            latestPhase: "deployable",
            status: "complete",
            latestPreviewUrl: previewUrl,
          });

          send({ type: "preview_url", url: previewUrl });

          send({
            type: "phase",
            phase: "deployable",
            label: "App preview ready ✓",
          });

          const updated = await getProjectById(id);
          if (updated) {
            send({ type: "completed", session: toBuilderSession(updated) });
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Preview generation failed.";

          // Don't kill the sandbox on error — user may want to investigate
          await updateProject(id, {
            latestPhase: "failed",
            status: "failed",
            lastError: msg,
          });

          send({ type: "error", message: msg });

          // Clean up sandbox on failure
          if (sandbox) {
            try {
              await sandbox.kill();
            } catch {
              /* ignore cleanup errors */
            }
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
