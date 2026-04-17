import { auth } from "@clerk/nextjs/server";
import { getProjectByIdForOwner, type ProjectRecord } from "@/lib/project-store";
import { log } from "@/lib/log";

export type PublicProjectRecord = Omit<ProjectRecord, "sessionToken">;

export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (userId) {
      log.auth("User authenticated", { userId: userId.slice(0, 12) + "…" });
    } else {
      log.authWarn("No authenticated user — auth() returned null userId");
    }
    return userId ?? null;
  } catch (err) {
    log.authError("auth() threw an exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function unauthorizedResponse() {
  log.authWarn("Returning 401 Unauthorized");
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function forbiddenResponse() {
  log.authWarn("Returning 403 Forbidden");
  return Response.json({ error: "Forbidden." }, { status: 403 });
}

export function sanitizeProjectForResponse(project: ProjectRecord): PublicProjectRecord {
  const { sessionToken: _sessionToken, ...safeProject } = project;
  return safeProject;
}

export async function requireOwnedProject(
  projectId: string,
): Promise<{ userId: string; project: ProjectRecord } | { response: Response }> {
  log.auth("requireOwnedProject", { projectId });

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    log.authError("requireOwnedProject: no userId — returning 401", { projectId });
    return { response: unauthorizedResponse() };
  }

  const project = await getProjectByIdForOwner(projectId, userId);
  if (!project) {
    log.authWarn("requireOwnedProject: project not found for user — returning 403", {
      projectId,
      userId: userId.slice(0, 12) + "…",
    });
    return { response: forbiddenResponse() };
  }

  log.auth("requireOwnedProject: OK", {
    projectId,
    userId: userId.slice(0, 12) + "…",
    projectName: project.name,
    phase: project.latestPhase,
  });
  return { userId, project };
}
