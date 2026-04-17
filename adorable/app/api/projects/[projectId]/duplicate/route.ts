import { NextRequest } from "next/server";
import { requireOwnedProject, sanitizeProjectForResponse } from "@/lib/api-auth";
import { duplicateProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }

  const providedSessionToken = _req.headers.get("x-builder-session-token")?.trim();
  if (!owned.project.sessionToken || !providedSessionToken || providedSessionToken !== owned.project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const project = await duplicateProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }
  return Response.json({ project: sanitizeProjectForResponse(project) }, { status: 201 });
}
