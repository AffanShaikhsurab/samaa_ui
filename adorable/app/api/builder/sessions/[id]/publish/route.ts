/**
 * POST /api/builder/sessions/{id}/publish
 *
 * Pushes the generated Flutter project to the centralized "Samaa Storage"
 * GitHub repository under `users/{clerkUserId}/{projectId}/`.
 *
 * Layout inside samaa-storage:
 *   users/{clerkId}/{projectId}/app.ancl
 *   users/{clerkId}/{projectId}/lib/main.dart
 *   users/{clerkId}/{projectId}/pubspec.yaml
 *   users/{clerkId}/{projectId}/README.md
 *
 * SSE events:
 *   { type: "phase", phase: "repo_publish", label: string }
 *   { type: "completed", session: BuilderSession }
 *   { type: "error", message: string }
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import {
  getProjectById,
  updateProject,
  updateProjectGitMetadata,
  sealPhaseCheckpoint,
  clearPhaseCheckpoint,
} from "@/lib/project-store";
import { publishToSamaaStorage } from "@/lib/github-storage";
import { isConvexEnabled, convexMutation } from "@/lib/convex-server";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

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

  // Allow resume calls from ancl_generation or failed phase
  const validPublishPhases = ["repo_publish", "ancl_generation", "failed"];
  if (!validPublishPhases.includes(owned.project.latestPhase)) {
    return Response.json(
      {
        error: `repo_publish cannot run from phase: ${owned.project.latestPhase}.`,
      },
      { status: 409 },
    );
  }

  const { anclCode, flutterCode, name: projectName } = owned.project;

  if (!anclCode && !flutterCode) {
    return Response.json(
      { error: "No ANCL or Flutter code available. Run ANCL generation first." },
      { status: 400 },
    );
  }

  if (!process.env.GITHUB_TOKEN?.trim()) {
    return Response.json(
      { error: "GITHUB_TOKEN is not configured. Cannot publish to GitHub." },
      { status: 503 },
    );
  }

  // Get the Clerk user ID for storage path
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  await updateProject(id, { latestPhase: "repo_publish", status: "running" });

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
          // ──────────────────────────────────────────────────────────────────
          // Determine publish strategy:
          //   1. If GITHUB_STORAGE_OWNER is set → use centralized samaa-storage
          //   2. Otherwise fall back to legacy per-project repo creation
          // ──────────────────────────────────────────────────────────────────
          const useSamaaStorage = Boolean(process.env.GITHUB_STORAGE_OWNER?.trim());

          log.info("publish: strategy resolved", {
            id,
            useSamaaStorage,
            clerkUserId,
            hasAnclCode: Boolean(anclCode),
            hasFlutterCode: Boolean(flutterCode),
          });

          send({
            type: "phase",
            phase: "repo_publish",
            label: useSamaaStorage
              ? "Publishing to Samaa Storage…"
              : "Creating GitHub repository…",
          });

          let gitHubUrl: string;
          let fullRepoName: string;
          let commitSha: string;
          let storagePath: string | undefined;

          if (useSamaaStorage) {
            // ── NEW: centralized samaa-storage publish ─────────────────────
            send({
              type: "phase",
              phase: "repo_publish",
              label: `Committing to users/${clerkUserId}/${id}/…`,
            });

            const result = await publishToSamaaStorage({
              clerkUserId,
              projectId: id,
              projectName: projectName ?? "Samaa App",
              anclCode,
              flutterCode,
            });

            gitHubUrl = result.folderUrl;
            fullRepoName = result.fullRepoName;
            commitSha = result.commitSha;
            storagePath = result.storagePath;

            log.info("publish: committed to samaa-storage", {
              id,
              storagePath,
              folderUrl: gitHubUrl,
              commitSha,
              filesCount: result.filesCount,
            });
          } else {
            // ── LEGACY: create per-project repo (fallback) ─────────────────
            const { createGithubRepository, getRepository, pushFilesToGitHub } =
              await import("@/lib/github-rest");

            const repoName = `samaa-${id}`;
            const description = `Flutter app: ${projectName ?? "Samaa Generated App"}`;
            const org = process.env.GITHUB_ORG?.trim() || undefined;

            const repoResult = await createGithubRepository({
              name: repoName,
              description,
              private: true,
              owner: org,
              autoInit: true,
            });

            send({
              type: "phase",
              phase: "repo_publish",
              label: `Repository created: ${repoResult.fullName}`,
            });

            const safeProjectName =
              projectName?.replace(/[^a-zA-Z0-9\s]/g, "").trim() ?? "Samaa App";
            const files: Array<{ path: string; content: string }> = [];
            if (anclCode) files.push({ path: "app.ancl", content: anclCode });
            if (flutterCode) files.push({ path: "lib/main.dart", content: flutterCode });

            const pushResult = await pushFilesToGitHub({
              owner: repoResult.owner,
              repo: repoResult.repo,
              branch: repoResult.defaultBranch,
              files,
              commitMessage: `feat: initial Flutter project generated by Samaa`,
            });

            gitHubUrl = repoResult.htmlUrl;
            fullRepoName = repoResult.fullName;
            commitSha = pushResult.commitSha;
          }

          // ── Persist metadata ──────────────────────────────────────────────
          await updateProjectGitMetadata(id, {
            githubRepositoryUrl: gitHubUrl,
            githubRepositoryFullName: fullRepoName,
            sourceCommitSha: commitSha,
          });

          // Sync to Convex if enabled
          if (isConvexEnabled()) {
            try {
              const { api } = await import("@/convex/_generated/api");
              await convexMutation(api.projects.updateGitMetadata, {
                // Note: Convex uses its own ID type; we use the string project ID
                // from the file store here. The Convex project ID is resolved
                // separately when Convex is the primary store.
                // TODO: after full Convex migration, use Convex document ID.
              } as never);
            } catch {
              // Non-fatal — file store already persisted the metadata
              log.warn("publish: Convex git metadata sync failed (non-fatal)");
            }
          }

          // Seal the repo_publish checkpoint
          await sealPhaseCheckpoint(id, "repo_publish");

          await updateProject(id, {
            latestPhase: "preview_ready",
            status: "idle",
          });

          send({
            type: "phase",
            phase: "preview_ready",
            label: `Published → ${gitHubUrl}`,
          });

          send({
            type: "artifact",
            artifact: {
              kind: "github_repo",
              title: `GitHub: ${fullRepoName}${storagePath ? ` / ${storagePath}` : ""}`,
              url: gitHubUrl,
              content: JSON.stringify(
                {
                  fullRepoName,
                  folderUrl: gitHubUrl,
                  storagePath,
                  commitSha,
                  strategy: storagePath ? "samaa-storage" : "per-project-repo",
                },
                null,
                2,
              ),
            },
          });

          const updated = await getProjectById(id);
          if (updated) {
            send({ type: "completed", session: toBuilderSession(updated) });
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "GitHub publish failed.";
          log.error("publish: failed", { id, error: msg });
          await clearPhaseCheckpoint(id, "repo_publish");
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
