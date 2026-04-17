import { NextRequest } from "next/server";
import { requireOwnedProject, sanitizeProjectForResponse } from "@/lib/api-auth";
import { appendBuildHistory, restoreProjectFromSnapshot } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; snapshotId: string }> },
) {
  const { projectId, snapshotId } = await params;

  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const providedSessionToken = _req.headers.get("x-builder-session-token")?.trim();
  if (!owned.project.sessionToken || !providedSessionToken || providedSessionToken !== owned.project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const project = await restoreProjectFromSnapshot(projectId, snapshotId);
  if (!project) {
    return Response.json({ error: "Project or snapshot not found." }, { status: 404 });
  }

  await appendBuildHistory(projectId, {
    action: "restore",
    phase: project.latestPhase,
    outcome: "partial",
    note: `Restored from snapshot ${snapshotId}.`,
  });

  return Response.json({ project: sanitizeProjectForResponse(project) });
}
