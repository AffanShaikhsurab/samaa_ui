/**
 * POST /api/builder/sessions/{id}/walkthrough
 *
 * Accepts user feedback on a single ScreenHypothesis and advances the
 * walkthrough to the next unvalidated screen.
 *
 * When all screens are validated, the project automatically transitions
 * to "ancl_generation" phase.
 *
 * Body:
 * {
 *   screenId: string;
 *   action: "accept" | "modify" | "reject";
 *   feedback?: string;
 *   answers?: Record<string, string>;  // questionId -> answer text
 * }
 *
 * Response:
 * {
 *   nextScreen: ScreenHypothesis | null;
 *   isComplete: boolean;
 *   session: BuilderSession;
 * }
 */
import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { toBuilderSession } from "@/lib/builder-session";
import {
  acknowledgeDegradedResearch,
  applyWalkthroughFeedback,
  areRequirementsSealed,
} from "@/lib/project-store";

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
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    screenId?: string;
    action?: "accept" | "modify" | "reject";
    feedback?: string;
    answers?: Record<string, string>;
    allowDegradedContinue?: boolean;
  };

  let projectState = owned.project;

  if (areRequirementsSealed(projectState)) {
    return Response.json(
      { error: "Requirements are already sealed and cannot be modified." },
      { status: 409 },
    );
  }

  const researchDegraded = projectState.requirementsDoc?.validation?.researchDegraded === true;
  const researchAcknowledged = projectState.requirementsDoc?.validation?.researchAcknowledged === true;

  if (researchDegraded && !researchAcknowledged) {
    if (!body.allowDegradedContinue) {
      return Response.json(
        {
          error:
            "Research is degraded. Confirm allowDegradedContinue to acknowledge and continue walkthrough.",
        },
        { status: 409 },
      );
    }

    const acknowledged = await acknowledgeDegradedResearch(id);
    if (!acknowledged) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    projectState = acknowledged;
  }

  if (projectState.latestPhase !== "walkthrough") {
    return Response.json(
      {
        error: `Walkthrough feedback is only allowed during walkthrough phase. Current phase: ${projectState.latestPhase}.`,
      },
      { status: 409 },
    );
  }

  if (!body.screenId) {
    return Response.json({ error: "screenId is required." }, { status: 400 });
  }
  if (!body.action || !["accept", "modify", "reject"].includes(body.action)) {
    return Response.json({ error: "action must be accept, modify, or reject." }, { status: 400 });
  }

  const result = await applyWalkthroughFeedback(id, {
    screenId: body.screenId,
    action: body.action,
    feedback: body.feedback,
    answers: body.answers,
  });

  if (!result) {
    return Response.json({ error: "Screen not found or project unavailable." }, { status: 404 });
  }

  return Response.json({
    nextScreen: result.nextScreen,
    isComplete: result.isComplete,
    session: toBuilderSession(result.project),
  });
}

/**
 * GET /api/builder/sessions/{id}/walkthrough
 *
 * Returns the current walkthrough state: all screens, current index,
 * wireframe HTML, and clarification questions.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if ("response" in owned) return owned.response;

  const sessionToken = owned.project.sessionToken;
  const providedToken = req.headers.get("x-builder-session-token")?.trim();
  if (!sessionToken || !providedToken || providedToken !== sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const { getDiscoveryState } = await import("@/lib/project-store");
  const state = await getDiscoveryState(id);
  if (!state) {
    return Response.json({ error: "Discovery data not available yet." }, { status: 404 });
  }

  return Response.json(state);
}
