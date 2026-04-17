/**
 * POST /api/builder/sessions/{id}/resume
 *
 * Resumes a stopped/failed build from a specific pipeline phase.
 * Only the target phase runs — all prior sealed phases are skipped.
 *
 * Body:  { fromPhase: BuilderPhase }
 * Auth:  x-builder-session-token header
 *
 * Response: SSE stream (same event format as the original phase routes)
 *
 * Supported resumable phases:
 *   - ancl_generation  → re-runs ANCL writer + critic + E2B compile
 *   - repo_publish     → re-pushes code to GitHub (or creates new repo if lost)
 *   - preview_ready    → re-triggers preview build
 *
 * Prerequisites enforced:
 *   - ancl_generation  requires: walkthrough checkpoint sealed
 *   - repo_publish     requires: ancl_generation checkpoint sealed (anclCode present)
 *   - preview_ready    requires: repo_publish checkpoint sealed
 */

import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent } from "@/lib/builder-session";
import {
  clearPhaseCheckpoint,
  getProjectCheckpoints,
  updateProject,
} from "@/lib/project-store";
import type { BuilderPhase } from "@/lib/project-store";
import {
  resolveResumePoint,
  isPhaseSealed,
  INTERACTIVE_PHASES,
  PHASE_PREREQUISITES,
} from "@/lib/checkpoint";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Phases that can be triggered via this resume endpoint. */
const RESUMABLE_PHASES = new Set<BuilderPhase>([
  "ancl_generation",
  "repo_publish",
  "preview_ready",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Auth ────────────────────────────────────────────────────────────────
  const owned = await requireOwnedProject(id);
  if ("response" in owned) return owned.response;

  const project = owned.project;
  const sessionToken = project.sessionToken;
  const providedToken = req.headers.get("x-builder-session-token")?.trim();
  if (!sessionToken || !providedToken || providedToken !== sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as { fromPhase?: string };
  const fromPhase = body.fromPhase as BuilderPhase | undefined;

  if (!fromPhase) {
    return Response.json({ error: "fromPhase is required." }, { status: 400 });
  }

  // ── Validate phase is resumable ─────────────────────────────────────────
  if (!RESUMABLE_PHASES.has(fromPhase)) {
    if (INTERACTIVE_PHASES.has(fromPhase)) {
      return Response.json(
        {
          error: `Phase "${fromPhase}" is interactive and cannot be resumed via API. Continue the walkthrough in the UI.`,
        },
        { status: 400 },
      );
    }
    return Response.json(
      { error: `Phase "${fromPhase}" is not resumable via this endpoint.` },
      { status: 400 },
    );
  }

  // ── Re-entrancy guard ────────────────────────────────────────────────────
  if (project.status === "running") {
    return Response.json(
      { error: "Project is already running. Wait for the current operation to complete." },
      { status: 409 },
    );
  }

  // ── Prerequisite check ──────────────────────────────────────────────────
  const checkpoints = await getProjectCheckpoints(id);
  const projectWithCheckpoints = { ...project, checkpoints };
  const prereqs = PHASE_PREREQUISITES[fromPhase] ?? [];
  const missingPrereqs = prereqs.filter((p) => !isPhaseSealed(projectWithCheckpoints, p));

  if (missingPrereqs.length > 0) {
    return Response.json(
      {
        error: `Cannot resume "${fromPhase}" — prerequisite phases not sealed: ${missingPrereqs.join(", ")}.`,
        missingPrereqs,
      },
      { status: 409 },
    );
  }

  // ── Optional: validate data completeness for prerequisites ─────────────
  const analysis = resolveResumePoint(projectWithCheckpoints);
  log.session("POST /resume — resume requested", {
    id,
    fromPhase,
    lastSealed: analysis.lastSealed,
    stuckPhase: analysis.stuckPhase,
  });

  // ── Clear any dirty checkpoint for target phase ─────────────────────────
  await clearPhaseCheckpoint(id, fromPhase);

  // ── Dispatch to the correct phase handler ───────────────────────────────
  // We forward to the existing Next.js routes by constructing an internal
  // fetch to the appropriate route. This keeps the phase logic in one place.
  const origin = req.nextUrl.origin;
  const routeMap: Partial<Record<BuilderPhase, string>> = {
    ancl_generation: `/api/builder/sessions/${id}/ancl`,
    repo_publish: `/api/builder/sessions/${id}/publish`,
    preview_ready: `/api/builder/sessions/${id}/preview`,
  };

  const targetRoute = routeMap[fromPhase];
  if (!targetRoute) {
    return Response.json({ error: `No handler for phase "${fromPhase}".` }, { status: 501 });
  }

  // Advance the project to the resume phase so the phase guard in the target
  // route allows the request through.
  await updateProject(id, { latestPhase: fromPhase, status: "idle" });

  log.session("POST /resume — forwarding to phase handler", { id, fromPhase, targetRoute });

  // Forward the request to the original route handler via internal fetch.
  // This preserves the SSE stream format the client already understands.
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${origin}${targetRoute}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-builder-session-token": providedToken,
        // Pass the original authorization cookie so the upstream route
        // passes the Clerk auth check.
        Cookie: req.headers.get("cookie") ?? "",
        Authorization: req.headers.get("authorization") ?? "",
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Resume dispatch failed.";
    log.session("POST /resume — dispatch error", { id, fromPhase, error: msg });
    await updateProject(id, { latestPhase: "failed", status: "failed", lastError: msg });

    // Return a minimal SSE error stream so the client gets a clean close
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseEvent({ type: "error", message: msg })));
        controller.close();
      },
    });
    return new Response(errorStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Stream the upstream SSE response directly to the client.
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
