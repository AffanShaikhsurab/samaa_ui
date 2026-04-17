import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { appendProjectArtifact, updateProjectGitMetadata } from "@/lib/project-store";
import {
  createBranchReference,
  createPullRequest,
  getPullRequest,
  getRepository,
  isPullRequestMerged,
  mergePullRequest,
  parseRepositoryFullName,
} from "@/lib/github-rest";

export const dynamic = "force-dynamic";

type RemediationAction = "open_pr" | "sync_status" | "merge_pr";

type RemediationBody = {
  action?: RemediationAction;
  baseBranch?: string;
  branchName?: string;
  title?: string;
  body?: string;
  pullNumber?: number;
  expectedHeadSha?: string;
  mergeMethod?: "merge" | "squash" | "rebase";
};

type RemediationEventPayload = {
  type: string;
  status: "info" | "success" | "error";
  message: string;
  data?: Record<string, unknown>;
  occurredAt: string;
};

function parsePullNumberFromUrl(url?: string): number | null {
  if (!url) return null;
  const match = url.match(/\/pull\/(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function defaultBranchName(projectId: string): string {
  const suffix = projectId.replace(/-/g, "").slice(0, 8);
  return `remediation/${suffix}-${Date.now()}`;
}

async function appendRemediationEvent(projectId: string, event: RemediationEventPayload) {
  await appendProjectArtifact(projectId, {
    kind: "remediation_status_event",
    title: event.type,
    content: JSON.stringify(event, null, 2),
  });
}

async function getRepositoryContext(fullName: string) {
  const { owner, repo } = parseRepositoryFullName(fullName);
  const repository = await getRepository(owner, repo);
  return {
    owner,
    repo,
    defaultBranch: repository.defaultBranch,
    repositoryUrl: repository.htmlUrl,
  };
}

function parseEventArtifact(artifact: { kind: string; content?: string; title?: string }) {
  if (artifact.kind !== "remediation_status_event" || !artifact.content) {
    return null;
  }
  try {
    return JSON.parse(artifact.content) as RemediationEventPayload;
  } catch {
    return {
      type: artifact.title || "unknown",
      status: "info",
      message: artifact.content,
      occurredAt: new Date().toISOString(),
    } as RemediationEventPayload;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) return owned.response;

  const project = owned.project;
  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!project.sessionToken || !providedSessionToken || providedSessionToken !== project.sessionToken) {
    return Response.json({ error: "Unauthorized remediation session." }, { status: 403 });
  }

  const events = project.artifacts.map(parseEventArtifact).filter((entry): entry is RemediationEventPayload => Boolean(entry));

  const pullNumber = parsePullNumberFromUrl(project.remediationPrUrl);
  let prStatus: Record<string, unknown> | null = null;

  if (project.githubRepositoryFullName && pullNumber) {
    try {
      const { owner, repo } = parseRepositoryFullName(project.githubRepositoryFullName);
      const [pr, merged] = await Promise.all([
        getPullRequest({ owner, repo, pullNumber }),
        isPullRequestMerged({ owner, repo, pullNumber }),
      ]);

      prStatus = {
        number: pr.number,
        url: pr.url,
        state: pr.state,
        merged,
        headSha: pr.headSha,
        baseRef: pr.baseRef,
        mergeCommitSha: pr.mergeCommitSha,
      };
    } catch {
      prStatus = null;
    }
  }

  return Response.json({
    repository: {
      fullName: project.githubRepositoryFullName,
      url: project.githubRepositoryUrl,
    },
    sourceCommitSha: project.sourceCommitSha,
    remediationBranch: project.remediationBranch,
    remediationPrUrl: project.remediationPrUrl,
    remediationPullRequest: prStatus,
    events,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const owned = await requireOwnedProject(projectId);
  if ("response" in owned) return owned.response;

  const project = owned.project;
  const providedSessionToken = req.headers.get("x-builder-session-token")?.trim();
  if (!project.sessionToken || !providedSessionToken || providedSessionToken !== project.sessionToken) {
    return Response.json({ error: "Unauthorized remediation session." }, { status: 403 });
  }

  if (!project.githubRepositoryFullName || !project.githubRepositoryUrl || !project.sourceCommitSha) {
    return Response.json(
      {
        error: "Repository and source commit metadata are required before remediation lifecycle operations.",
      },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as RemediationBody;
  const action = body.action || "sync_status";

  try {
    const repoContext = await getRepositoryContext(project.githubRepositoryFullName);

    if (action === "open_pr") {
      const branchName = body.branchName?.trim() || defaultBranchName(projectId);
      const baseBranch = body.baseBranch?.trim() || repoContext.defaultBranch;
      const sourceCommitSha = project.sourceCommitSha;

      await createBranchReference({
        owner: repoContext.owner,
        repo: repoContext.repo,
        branchName,
        sourceSha: sourceCommitSha,
      });

      await appendRemediationEvent(projectId, {
        type: "remediation_branch_created",
        status: "success",
        message: `Created remediation branch ${branchName}.`,
        data: { branchName, sourceCommitSha },
        occurredAt: new Date().toISOString(),
      });

      const pullRequest = await createPullRequest({
        owner: repoContext.owner,
        repo: repoContext.repo,
        title: body.title?.trim() || `Remediation updates for ${project.name}`,
        body:
          body.body?.trim() ||
          [
            "Automated remediation updates generated by Samaa.",
            "",
            `Project: ${project.id}`,
            `Source commit: ${sourceCommitSha}`,
          ].join("\n"),
        head: branchName,
        base: baseBranch,
      });

      await updateProjectGitMetadata(projectId, {
        remediationBranch: branchName,
        remediationPrUrl: pullRequest.url,
      });

      await appendRemediationEvent(projectId, {
        type: "remediation_pr_opened",
        status: "success",
        message: `Opened remediation PR #${pullRequest.number}.`,
        data: {
          pullNumber: pullRequest.number,
          pullRequestUrl: pullRequest.url,
          headSha: pullRequest.headSha,
          baseBranch,
          branchName,
        },
        occurredAt: new Date().toISOString(),
      });

      return Response.json({
        action,
        branchName,
        pullRequest,
      });
    }

    const pullNumber =
      body.pullNumber ??
      parsePullNumberFromUrl(project.remediationPrUrl) ??
      parsePullNumberFromUrl(owned.project.remediationPrUrl);

    if (!pullNumber) {
      return Response.json({ error: "pullNumber is required when no remediationPrUrl exists." }, { status: 400 });
    }

    if (action === "merge_pr") {
      const mergeResult = await mergePullRequest({
        owner: repoContext.owner,
        repo: repoContext.repo,
        pullNumber,
        expectedHeadSha: body.expectedHeadSha,
        method: body.mergeMethod || "squash",
        commitTitle: `Merge remediation for ${project.name}`,
        commitMessage: `Automated remediation merge for project ${project.id}`,
      });

      if (!mergeResult.merged || !mergeResult.sha) {
        await appendRemediationEvent(projectId, {
          type: "remediation_pr_merge_failed",
          status: "error",
          message: mergeResult.message || "GitHub did not merge the pull request.",
          data: { pullNumber },
          occurredAt: new Date().toISOString(),
        });

        return Response.json(
          {
            error: mergeResult.message || "Failed to merge remediation pull request.",
          },
          { status: 409 },
        );
      }

      await updateProjectGitMetadata(projectId, {
        sourceCommitSha: mergeResult.sha,
      });

      await appendRemediationEvent(projectId, {
        type: "remediation_pr_merged",
        status: "success",
        message: `Merged remediation PR #${pullNumber}.`,
        data: { pullNumber, remediatedCommitSha: mergeResult.sha },
        occurredAt: new Date().toISOString(),
      });

      return Response.json({
        action,
        merged: true,
        pullNumber,
        remediatedCommitSha: mergeResult.sha,
      });
    }

    const [pr, merged] = await Promise.all([
      getPullRequest({ owner: repoContext.owner, repo: repoContext.repo, pullNumber }),
      isPullRequestMerged({ owner: repoContext.owner, repo: repoContext.repo, pullNumber }),
    ]);

    const resolvedCommitSha = merged ? pr.mergeCommitSha || pr.headSha : project.sourceCommitSha;

    if (merged && resolvedCommitSha && resolvedCommitSha !== project.sourceCommitSha) {
      await updateProjectGitMetadata(projectId, {
        sourceCommitSha: resolvedCommitSha,
      });
    }

    await appendRemediationEvent(projectId, {
      type: "remediation_status_synced",
      status: "info",
      message: `Synced remediation PR #${pullNumber} status (${merged ? "merged" : pr.state}).`,
      data: {
        pullNumber,
        state: pr.state,
        merged,
        headSha: pr.headSha,
        mergeCommitSha: pr.mergeCommitSha,
      },
      occurredAt: new Date().toISOString(),
    });

    return Response.json({
      action,
      remediationPullRequest: {
        number: pr.number,
        url: pr.url,
        state: pr.state,
        merged,
        headSha: pr.headSha,
        mergeCommitSha: pr.mergeCommitSha,
      },
      sourceCommitSha: resolvedCommitSha,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remediation lifecycle operation failed.";

    await appendRemediationEvent(projectId, {
      type: "remediation_lifecycle_error",
      status: "error",
      message,
      occurredAt: new Date().toISOString(),
    });

    return Response.json({ error: message }, { status: 500 });
  }
}
