/**
 * POST /api/builder/sessions/{id}/discover
 *
 * Kicks off the 3-stage discovery pipeline (intent analysis → domain
 * research → screen architecture) and streams progress as SSE events.
 *
 * The result is stored in the project record and the session transitions
 * to the "walkthrough" phase automatically.
 *
 * Body: { message: string }
 *
 * SSE events:
 *   { type: "phase", phase: BuilderPhase, label: string }
 *   { type: "discovery_event", event: DiscoveryEvent }
 *   { type: "completed", session: BuilderSession }
 *   { type: "error", message: string }
 */
import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { sseEvent, toBuilderSession } from "@/lib/builder-session";
import {
  beginDiscoveryRun,
  finalizeDiscoveryRun,
  updateProject,
  type ClarificationQuestion,
} from "@/lib/project-store";
import type { DiscoveryEvent } from "@affanshaikhsurab/agent-sdk";

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

  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const allowDegradedContinue =
    (typeof (body as { allowDegradedContinue?: unknown }).allowDegradedContinue === "boolean"
      ? Boolean((body as { allowDegradedContinue?: unknown }).allowDegradedContinue)
      : false);
  const userIntent = body.message?.trim() ?? owned.project.initialPrompt ?? "";

  if (!userIntent) {
    return Response.json({ error: "Provide a message or initial prompt." }, { status: 400 });
  }

  const discoveryStart = await beginDiscoveryRun(id, userIntent);
  if (!discoveryStart.ok) {
    return Response.json({ error: discoveryStart.reason }, { status: 409 });
  }

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
        try { controller.close(); } catch { /* ignore */ }
      };

      void (async () => {
        try {
          // Delegate to the discovery orchestrator (Next.js–side thin wrapper)
          const { runDiscovery } = await import("@/lib/discovery-orchestrator");
          const result = await runDiscovery({
            projectId: id,
            userIntent,
            appName: owned.project.name,
            onEvent: (evt: DiscoveryEvent) => {
              send({ type: "discovery_event", event: evt });

              // Mirror main phase changes as top-level phase SSE events
              if (evt.type === "intent_analysis_started") {
                send({ type: "phase", phase: "intent_extraction", label: "Analysing your idea" });
              } else if (evt.type === "research_started") {
                send({ type: "phase", phase: "domain_research", label: "Researching your domain" });
              } else if (evt.type === "architecture_started") {
                send({ type: "phase", phase: "screen_architecture", label: "Designing screen architecture" });
              }
            },
          });

          const researchDegraded =
            result.requirements.validation?.researchDegraded === true ||
            result.requirements.domainInsights.some((insight: { degraded?: boolean }) => insight.degraded);
          const researchAvailable =
            result.requirements.validation?.researchAvailable === true ||
            result.requirements.domainInsights.some((insight: { sources?: Array<unknown> }) => (insight.sources?.length ?? 0) > 0);

          const shouldBlockWalkthrough = researchDegraded && !allowDegradedContinue;

          const updated = await finalizeDiscoveryRun(id, {
            screenHypotheses: result.requirements.screens,
            requirementsDoc: {
              ...result.requirements,
              validation: {
                walkthroughCompleted: result.requirements.validation?.walkthroughCompleted ?? false,
                researchAvailable: result.requirements.validation?.researchAvailable ?? researchAvailable,
                researchDegraded: result.requirements.validation?.researchDegraded ?? researchDegraded,
                sealedAt: result.requirements.validation?.sealedAt,
                researchAcknowledged: allowDegradedContinue,
              },
            },
            wireframeHtml: result.wireframeHtml,
            clarificationQuestions: result.clarificationQuestions as Record<string, ClarificationQuestion[]>,
            researchAvailable,
            researchDegraded,
            blocked: shouldBlockWalkthrough,
            acknowledgedDegradedResearch: allowDegradedContinue,
          });

          if (!updated) {
            throw new Error("Failed to persist discovery results.");
          }

          if (shouldBlockWalkthrough) {
            send({
              type: "stage_blocked",
              stage: "domain_research",
              reason: "Research unavailable or degraded. Confirm to continue to walkthrough.",
              recoverable: true,
            });
          } else if ((updated.discoveryQuestions?.length ?? 0) > 0) {
            send({
              type: "phase",
              phase: "collecting_questions",
              label: "Collecting final clarifications",
            });
            send({
              type: "question_set_ready",
              questions: updated.discoveryQuestions,
            });
          } else {
            send({
              type: "artifact_ready",
              artifact: "requirements",
              label: "Draft requirements ready",
            });
          }

          send({
            type: "walkthrough_state",
            currentIndex: updated.currentWalkthroughScreenIndex ?? 0,
            totalScreens: updated.screenHypotheses?.length ?? 0,
            blocked: shouldBlockWalkthrough,
          });
          send({ type: "completed", session: toBuilderSession(updated) });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Discovery failed.";
          await updateProject(id, { latestPhase: "failed", status: "failed", lastError: msg });
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
