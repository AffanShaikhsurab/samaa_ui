import { NextRequest } from "next/server";
import { getAuthenticatedUserId, requireOwnedProject, unauthorizedResponse } from "@/lib/api-auth";
import { toBuilderSession } from "@/lib/builder-session";
import { appendProjectMessage, createProject, ensureProjectSessionToken, getProjectByIdForOwner, updateProject } from "@/lib/project-store";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  log.session("POST /api/builder/sessions — incoming");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    log.authError("POST /api/builder/sessions — no userId, returning 401");
    return unauthorizedResponse();
  }

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    prompt?: string;
    name?: string;
    runtimeProvider?: "openai" | "anthropic" | "groq" | "nvidia";
  };

  log.session("Session request body parsed", {
    resuming: Boolean(body.projectId),
    hasPrompt: Boolean(body.prompt?.trim()),
    runtimeProvider: body.runtimeProvider,
  });

  if (body.projectId) {
    log.session("Resuming existing project", { projectId: body.projectId });
    const owned = await requireOwnedProject(body.projectId);
    if ("response" in owned) {
      return owned.response;
    }
    const existing = owned.project;

    let expectedSessionToken = existing.sessionToken ?? (await ensureProjectSessionToken(body.projectId));
    const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();

    // Owner-authenticated resume path for fresh browsers/devices.
    if (!providedSessionToken && expectedSessionToken) {
      log.session("Fresh resume — no client token, using owner auth", { projectId: body.projectId });
      const refreshedOwned = await getProjectByIdForOwner(body.projectId, userId);
      if (!refreshedOwned) {
        log.storeError("Project not found on resume", { projectId: body.projectId });
        return Response.json({ error: "Project not found." }, { status: 404 });
      }

      const session = toBuilderSession(refreshedOwned);
      log.session("Resume session returned (no token path)", { projectId: body.projectId, phase: session.phase });
      return Response.json({ session });
    }

    if (!expectedSessionToken || !providedSessionToken || providedSessionToken !== expectedSessionToken) {
      log.session("Token mismatch on resume — re-issuing session token", { projectId: body.projectId });
      expectedSessionToken = await ensureProjectSessionToken(body.projectId);
      if (!expectedSessionToken || providedSessionToken !== expectedSessionToken) {
        log.authWarn("Session token mismatch on resume after re-issue", { projectId: body.projectId });
        return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
      }
    }

    const refreshed = await getProjectByIdForOwner(body.projectId, userId);
    if (!refreshed) {
      log.storeError("Project not found after session validation", { projectId: body.projectId });
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    const session = toBuilderSession(refreshed);
    log.session("Resumed session OK", { projectId: body.projectId, phase: session.phase });
    return Response.json({ session });
  }

  const prompt = body.prompt?.trim() ?? "";
  log.session("Creating new project", { prompt: prompt.slice(0, 80), userId: userId.slice(0, 12) + "…" });

  const project = await createProject({
    ownerId: userId,
    name: body.name,
    initialPrompt: prompt,
    runtimeProvider: body.runtimeProvider,
  });

  await updateProject(project.id, {
    latestPhase: prompt ? "intent_extraction" : "planning",
    status: "idle",
  });

  if (prompt) {
    await appendProjectMessage(project.id, { role: "user", content: prompt });
  }

  const refreshed = await getProjectByIdForOwner(project.id, userId);
  if (!refreshed) {
    log.storeError("Failed to retrieve project after creation", { projectId: project.id });
    return Response.json({ error: "Failed to initialize project." }, { status: 500 });
  }

  const session = toBuilderSession(refreshed);
  log.session("New project created OK", { projectId: project.id, phase: session.phase });
  return Response.json({ session }, { status: 201 });
}
