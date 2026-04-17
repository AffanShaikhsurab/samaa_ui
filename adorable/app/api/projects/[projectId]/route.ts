import { NextRequest } from "next/server";
import { requireOwnedProject, sanitizeProjectForResponse } from "@/lib/api-auth";
import { deleteProject, updateProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }
  return Response.json({ project: sanitizeProjectForResponse(owned.project) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!owned.project.sessionToken || !providedSessionToken || providedSessionToken !== owned.project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    latestPreviewUrl?: string;
    runtimeProvider?: "openai" | "anthropic" | "groq" | "nvidia";
  };

  const project = await updateProject(projectId, body);
  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({ project: sanitizeProjectForResponse(project) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const providedSessionToken = _req.headers.get("x-builder-session-token")?.trim();
  if (!owned.project.sessionToken || !providedSessionToken || providedSessionToken !== owned.project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const deleted = await deleteProject(projectId);
  if (!deleted) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
