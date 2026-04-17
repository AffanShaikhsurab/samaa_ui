import { NextRequest } from "next/server";
import { getAuthenticatedUserId, sanitizeProjectForResponse, unauthorizedResponse } from "@/lib/api-auth";
import { createProject, listProjectsForOwner } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const projects = await listProjectsForOwner(userId);
  return Response.json({ projects: projects.map(sanitizeProjectForResponse) });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    initialPrompt?: string;
    runtimeProvider?: "openai" | "anthropic" | "groq" | "nvidia";
  };

  const initialPrompt = body.initialPrompt?.trim() ?? "";
  if (!initialPrompt) {
    return Response.json({ error: "initialPrompt is required." }, { status: 400 });
  }

  const project = await createProject({
    ownerId: userId,
    name: body.name,
    initialPrompt,
    runtimeProvider: body.runtimeProvider,
  });

  return Response.json({ project: sanitizeProjectForResponse(project) }, { status: 201 });
}
