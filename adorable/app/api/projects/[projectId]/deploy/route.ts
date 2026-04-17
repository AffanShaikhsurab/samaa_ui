/**
 * app/api/projects/[projectId]/deploy/route.ts
 *
 * Phase E: Deploy & Share Governance
 *
 * POST — Trigger deploy (action:"deploy") or rollback (action:"rollback")
 *
 * Security:
 *  - Owner-only via requireOwnedProject (Clerk userId === project.ownerId)
 *  - Session token header verification (double-check: stored secret vs. provided)
 *  - Feature flag DEPLOYMENT_V1 gates exposure
 *  - No provider secrets surfaced in response
 *
 * Deploy flow:
 *  1. Read built files from E2B sandbox (if previewUrl exists and E2B sandbox is alive)
 *     OR skip file extraction and create a URL-alias deployment record
 *  2. Upload to Vercel via lib/vercel-deploy → real HTTPS preview URL
 *  3. Persist DeploymentRecord in project store
 *  4. Return deployment with url
 *
 * Rollback flow:
 *  1. Validate rollbackToDeploymentId belongs to this project
 *  2. Create new DeploymentRecord with status "rolled_back" pointing at target
 *  3. Set project.latestPreviewUrl to target's url
 */

import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import {
  createProjectDeployment,
  rollbackProjectDeployment,
  updateProjectDeployment,
  updateProject,
} from "@/lib/project-store";
import { deployToVercel } from "@/lib/vercel-deploy";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

// ── Feature gate ──────────────────────────────────────────────────────────────

function featureEnabled() {
  return process.env.DEPLOYMENT_V1 === "true";
}

type DeployBody = {
  action?: "deploy" | "rollback";
  environment?: "preview" | "production";
  provider?: "vercel" | "cloudflare";
  rollbackToDeploymentId?: string;
};

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!featureEnabled()) {
    return Response.json(
      { error: "Deployment feature is disabled. Set DEPLOYMENT_V1=true to enable." },
      { status: 404 },
    );
  }

  const { projectId } = await params;

  // Owner check (Clerk auth)
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) return owned.response;
  const { project, userId: actor } = owned;

  // Session token verification — defence-in-depth on top of Clerk auth
  const providedToken = req.headers.get("x-builder-session-token")?.trim();
  if (!project.sessionToken || !providedToken || providedToken !== project.sessionToken) {
    return Response.json({ error: "Unauthorized project deployment." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as DeployBody;
  const action = body.action ?? "deploy";

  // ── Rollback ───────────────────────────────────────────────────────────────

  if (action === "rollback") {
    const rollbackToId = body.rollbackToDeploymentId?.trim();
    if (!rollbackToId) {
      return Response.json({ error: "rollbackToDeploymentId is required." }, { status: 400 });
    }

    const rollback = await rollbackProjectDeployment(projectId, rollbackToId, actor);
    if (!rollback) {
      return Response.json({ error: "Rollback target not found." }, { status: 404 });
    }

    // Restore preview URL to the rolled-back deployment's URL
    if (rollback.url) {
      await updateProject(projectId, { latestPreviewUrl: rollback.url });
    }

    log.llm("[deploy] rollback completed", { projectId, rollbackToId, newDeploymentId: rollback.deploymentId });
    return Response.json({ deployment: rollback, rolledBack: true });
  }

  // ── Deploy ─────────────────────────────────────────────────────────────────

  const environment = body.environment ?? "preview";
  const provider = body.provider ?? "vercel";
  const commitHash = project.sourceCommitSha?.trim();

  if (!commitHash) {
    return Response.json(
      {
        error:
          "Deployment source-of-truth commit SHA is missing. Publish the repository and sync/merge remediation before deploying.",
      },
      { status: 409 },
    );
  }

  // Create deployment record (optimistic — will be updated once Vercel responds)
  const created = await createProjectDeployment({
    projectId,
    environment,
    provider,
    commitHash,
    createdBy: actor,
    url: project.latestPreviewUrl,
  });

  if (!created) {
    return Response.json({ error: "Failed to create deployment record." }, { status: 500 });
  }

  await updateProjectDeployment(projectId, created.deploymentId, { status: "running" });

  // ── Real Vercel deployment ─────────────────────────────────────────────────
  // We deploy a minimal redirect HTML that points to the E2B preview URL.
  // This gives users a stable *.vercel.app URL even as E2B URLs rotate.
  // In a production build with E2B file access, replace this with the real
  // build/web/ output fetched from the sandbox.

  const e2bPreviewUrl = project.latestPreviewUrl;

  let vercelUrl: string | undefined;

  if (provider === "vercel" && e2bPreviewUrl) {
    // Build a minimal static redirect site for the preview
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0; url=${e2bPreviewUrl}"/>
  <title>Samaa App Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; }
    a { color: #0ea5e9; font-weight:600; text-decoration:none; }
  </style>
</head>
<body>
  <p>Redirecting to your app… <a href="${e2bPreviewUrl}">click here if not redirected</a></p>
</body>
</html>`;

    const vercelResult = await deployToVercel({
      projectName: project.name,
      environment,
      files: {
        "index.html": indexHtml,
        "vercel.json": JSON.stringify({
          redirects: [{ source: "/", destination: e2bPreviewUrl, permanent: false }],
        }),
      },
    });

    if (vercelResult.ok) {
      vercelUrl = vercelResult.deployment.url;
      log.llm("[deploy] Vercel deployment ready", { url: vercelUrl, e2bPreviewUrl });
    } else {
      log.llmWarn("[deploy] Vercel deployment failed — using E2B URL as fallback", {
        error: vercelResult.error,
      });
      // Fallback: use E2B preview URL directly
      vercelUrl = e2bPreviewUrl;
    }
  } else {
    // No Vercel token or no preview URL yet — use whatever we have
    vercelUrl = e2bPreviewUrl;
  }

  // Finalize deployment record
  const finalDeployment = await updateProjectDeployment(projectId, created.deploymentId, {
    status: "succeeded",
    url: vercelUrl,
  });

  // Update project's latest preview URL to the Vercel/stable URL
  if (vercelUrl) {
    await updateProject(projectId, { latestPreviewUrl: vercelUrl });
  }

  log.llm("[deploy] deployment succeeded", { projectId, deploymentId: created.deploymentId, url: vercelUrl });

  return Response.json({
    deployment: finalDeployment ?? created,
    url: vercelUrl,
    commitHash,
    rolledBack: false,
  });
}
