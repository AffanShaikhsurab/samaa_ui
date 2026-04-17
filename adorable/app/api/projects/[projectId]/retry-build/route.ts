import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { enqueueProjectAction } from "@/lib/control-plane";
import { appendBuildHistory, areRequirementsSealed } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const current = owned.project;

  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!current.sessionToken || !providedSessionToken || providedSessionToken !== current.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  if (!areRequirementsSealed(current)) {
    return Response.json(
      {
        error: "Cannot retry build before discovery walkthrough is fully sealed.",
      },
      { status: 409 },
    );
  }

  const suggestedMessage = [
    "Retry the previous Flutter build for this project.",
    `Original goal: ${current.initialPrompt}`,
    "Keep the same user-facing intent and focus on getting to a successful preview.",
  ].join("\n");

  const enqueued = await enqueueProjectAction({
    projectId,
    action: "retry-build",
    message: suggestedMessage,
    idempotencyKey: req.headers.get("x-idempotency-key")?.trim() || `retry:${projectId}`,
  });

  if (!enqueued.accepted) {
    const status = enqueued.reason === "project_not_found" ? 404 : 429;
    return Response.json(
      {
        error:
          enqueued.reason === "project_not_found"
            ? "Project not found."
            : "Build queue is overloaded for this action. Retry later.",
        reason: enqueued.reason,
        retryAfterSeconds: enqueued.retryAfterSeconds,
        queueDepth: enqueued.queueDepth,
      },
      {
        status,
        headers: status === 429 ? { "Retry-After": String(enqueued.retryAfterSeconds) } : undefined,
      },
    );
  }

  await appendBuildHistory(projectId, {
    action: "retry-build",
    phase: "building",
    outcome: "partial",
    note: enqueued.created ? "User triggered retry build." : "Retry build request reused existing active job.",
  });

  return Response.json({
    projectId,
    jobId: enqueued.job.id,
    jobStatus: enqueued.job.status,
    created: enqueued.created,
    queueDepth: enqueued.queueDepth,
    projectActiveJobs: enqueued.projectActiveJobs,
    providerActiveJobs: enqueued.providerActiveJobs,
    suggestedMessage,
  });
}
