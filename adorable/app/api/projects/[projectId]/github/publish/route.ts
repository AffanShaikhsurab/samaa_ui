import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { appendProjectArtifact, updateProject, updateProjectGitMetadata } from "@/lib/project-store";
import {
  createGithubRepository,
  getBranchHeadSha,
  getCommitObject,
  parseRepositoryFullName,
} from "@/lib/github-rest";

export const dynamic = "force-dynamic";

type PublishBody = {
  repositoryName?: string;
  description?: string;
  owner?: string;
  private?: boolean;
  autoInit?: boolean;
  sourceCommitSha?: string;
};

function toRepositoryName(projectName: string, projectId: string): string {
  const base = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = projectId.replace(/-/g, "").slice(0, 6);
  return `${base || "flutter-app"}-${suffix}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) return owned.response;

  const project = owned.project;
  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!project.sessionToken || !providedSessionToken || providedSessionToken !== project.sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as PublishBody;
  const repositoryName = body.repositoryName?.trim() || toRepositoryName(project.name, project.id);

  if (!repositoryName) {
    return Response.json({ error: "repositoryName is required." }, { status: 400 });
  }

  await updateProject(projectId, { latestPhase: "repo_publish", status: "running", lastError: undefined });

  try {
    const createdRepo = await createGithubRepository({
      name: repositoryName,
      description: body.description?.trim() || `Generated from Samaa project ${project.id}`,
      owner: body.owner?.trim(),
      private: body.private ?? true,
      autoInit: body.autoInit ?? true,
    });

    let resolvedSourceSha = body.sourceCommitSha?.trim();
    if (resolvedSourceSha) {
      await getCommitObject(createdRepo.owner, createdRepo.repo, resolvedSourceSha);
    } else {
      resolvedSourceSha = await getBranchHeadSha(createdRepo.owner, createdRepo.repo, createdRepo.defaultBranch);
    }

    await updateProjectGitMetadata(projectId, {
      githubRepositoryFullName: createdRepo.fullName,
      githubRepositoryUrl: createdRepo.htmlUrl,
      sourceCommitSha: resolvedSourceSha,
      remediationBranch: undefined,
      remediationPrUrl: undefined,
    });

    await appendProjectArtifact(projectId, {
      kind: "repo_publish_event",
      title: "Repository published",
      content: JSON.stringify(
        {
          eventType: "repo_published",
          repositoryFullName: createdRepo.fullName,
          repositoryUrl: createdRepo.htmlUrl,
          defaultBranch: createdRepo.defaultBranch,
          sourceCommitSha: resolvedSourceSha,
          occurredAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    });

    await appendProjectArtifact(projectId, {
      kind: "traceability_report",
      title: "Repository + source commit metadata",
      content: JSON.stringify(
        {
          repository: {
            fullName: createdRepo.fullName,
            url: createdRepo.htmlUrl,
            owner: createdRepo.owner,
            name: createdRepo.repo,
          },
          sourceOfTruth: {
            commitSha: resolvedSourceSha,
          },
        },
        null,
        2,
      ),
    });

    await updateProject(projectId, { latestPhase: "repo_publish", status: "complete" });

    return Response.json({
      repository: {
        owner: createdRepo.owner,
        repo: createdRepo.repo,
        fullName: createdRepo.fullName,
        url: createdRepo.htmlUrl,
      },
      sourceCommitSha: resolvedSourceSha,
      parsed: parseRepositoryFullName(createdRepo.fullName),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish repository.";
    await updateProject(projectId, { status: "failed", latestPhase: "failed", lastError: message });

    await appendProjectArtifact(projectId, {
      kind: "repo_publish_event",
      title: "Repository publish failed",
      content: JSON.stringify(
        {
          eventType: "repo_publish_failed",
          message,
          occurredAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    });

    return Response.json({ error: message }, { status: 500 });
  }
}
