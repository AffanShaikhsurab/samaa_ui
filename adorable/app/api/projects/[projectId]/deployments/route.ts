import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { listProjectDeployments } from "@/lib/project-store";

export const dynamic = "force-dynamic";

function featureEnabled() {
  return process.env.DEPLOYMENT_V1 === "true";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!featureEnabled()) {
    return Response.json({ error: "Deployment feature is disabled." }, { status: 404 });
  }

  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) {
    return owned.response;
  }
  const project = owned.project;

  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!project.sessionToken || !providedSessionToken || providedSessionToken !== project.sessionToken) {
    return Response.json({ error: "Unauthorized deployment read." }, { status: 403 });
  }

  const deployments = await listProjectDeployments(projectId);
  return Response.json({ deployments: deployments ?? [] });
}
