import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { appendBuildHistory, createProjectSnapshot, getProjectById } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!owned.project.sessionToken || !providedSessionToken || providedSessionToken !== owned.project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    previewUrl?: string;
    phase?: typeof project.latestPhase;
    outcome?: "success" | "failed" | "partial";
    filesManifest?: Array<{ path: string; size?: number }>;
  };

  const snapshot = await createProjectSnapshot(projectId, {
    prompt: body.prompt ?? project.initialPrompt,
    previewUrl: body.previewUrl ?? project.latestPreviewUrl,
    phase: body.phase ?? project.latestPhase,
    outcome: body.outcome ?? "partial",
    filesManifest: body.filesManifest ?? [],
  });

  if (!snapshot) {
    return Response.json({ error: "Failed to create snapshot." }, { status: 500 });
  }

  await appendBuildHistory(projectId, {
    action: "generate",
    phase: snapshot.phase,
    outcome: snapshot.outcome,
    note: "Snapshot created.",
  });

  return Response.json({ snapshot }, { status: 201 });
}
