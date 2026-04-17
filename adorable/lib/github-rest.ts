type GitHubRequestError = Error & {
  status: number;
  body?: unknown;
};

type GitHubRepositoryResponse = {
  full_name: string;
  html_url: string;
  default_branch: string;
  owner: { login: string };
  name: string;
};

type GitHubRefResponse = {
  object: {
    sha: string;
  };
};

type GitHubCommitObjectResponse = {
  sha: string;
  html_url?: string;
};

type GitHubPullResponse = {
  number: number;
  html_url: string;
  state: "open" | "closed";
  draft?: boolean;
  merged?: boolean;
  merge_commit_sha?: string | null;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
};

type MergePullResponse = {
  sha: string;
  merged: boolean;
  message: string;
};

const GITHUB_API_BASE = (process.env.GITHUB_API_BASE_URL || "https://api.github.com").replace(/\/$/, "");
const GITHUB_API_VERSION = process.env.GITHUB_API_VERSION || "2022-11-28";

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    const err = new Error("Missing GITHUB_TOKEN environment variable.") as GitHubRequestError;
    err.status = 500;
    throw err;
  }
  return token;
}

async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getGitHubToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
  headers.set("User-Agent", "samaa-ui-github-integration");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const err = new Error(`GitHub API request failed: ${res.status}`) as GitHubRequestError;
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  return parsed as T;
}

export function parseRepositoryFullName(fullName: string): { owner: string; repo: string } {
  const normalized = fullName.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const [owner, repo] = normalized.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid githubRepositoryFullName. Expected format owner/repo.");
  }
  return { owner, repo };
}

export async function createGithubRepository(input: {
  name: string;
  description?: string;
  private?: boolean;
  owner?: string;
  autoInit?: boolean;
}): Promise<{
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
}> {
  const body = {
    name: input.name,
    description: input.description,
    private: input.private ?? true,
    auto_init: input.autoInit ?? true,
  };

  const route = input.owner?.trim() ? `/orgs/${encodeURIComponent(input.owner.trim())}/repos` : "/user/repos";
  const repo = await githubRequest<GitHubRepositoryResponse>(route, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    owner: repo.owner.login,
    repo: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
  };
}

export async function getRepository(owner: string, repo: string): Promise<{ defaultBranch: string; htmlUrl: string }> {
  const result = await githubRequest<GitHubRepositoryResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return {
    defaultBranch: result.default_branch,
    htmlUrl: result.html_url,
  };
}

export async function getBranchHeadSha(owner: string, repo: string, branch: string): Promise<string> {
  const ref = await githubRequest<GitHubRefResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  return ref.object.sha;
}

export async function getCommitObject(owner: string, repo: string, commitSha: string): Promise<{ sha: string; htmlUrl?: string }> {
  const commit = await githubRequest<GitHubCommitObjectResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(commitSha)}`,
  );
  return { sha: commit.sha, htmlUrl: commit.html_url };
}

export async function createBranchReference(input: {
  owner: string;
  repo: string;
  branchName: string;
  sourceSha: string;
}): Promise<string> {
  const response = await githubRequest<GitHubRefResponse>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${input.branchName}`,
        sha: input.sourceSha,
      }),
    },
  );

  return response.object.sha;
}

export async function createPullRequest(input: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}): Promise<{
  number: number;
  url: string;
  state: "open" | "closed";
  headSha: string;
  headRef: string;
  baseRef: string;
}> {
  const pr = await githubRequest<GitHubPullResponse>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        draft: input.draft ?? false,
      }),
    },
  );

  return {
    number: pr.number,
    url: pr.html_url,
    state: pr.state,
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
  };
}

export async function getPullRequest(input: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<{
  number: number;
  url: string;
  state: "open" | "closed";
  merged: boolean;
  mergeCommitSha?: string;
  headSha: string;
  headRef: string;
  baseRef: string;
}> {
  const pr = await githubRequest<GitHubPullResponse>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pullNumber}`,
  );

  return {
    number: pr.number,
    url: pr.html_url,
    state: pr.state,
    merged: Boolean(pr.merged),
    mergeCommitSha: pr.merge_commit_sha ?? undefined,
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
  };
}

export async function isPullRequestMerged(input: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<boolean> {
  try {
    await githubRequest<unknown>(
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pullNumber}/merge`,
    );
    return true;
  } catch (error) {
    const err = error as GitHubRequestError;
    if (err.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function mergePullRequest(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  expectedHeadSha?: string;
  method?: "merge" | "squash" | "rebase";
  commitTitle?: string;
  commitMessage?: string;
}): Promise<{ merged: boolean; sha?: string; message: string }> {
  const result = await githubRequest<MergePullResponse>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pullNumber}/merge`,
    {
      method: "PUT",
      body: JSON.stringify({
        sha: input.expectedHeadSha,
        merge_method: input.method ?? "squash",
        commit_title: input.commitTitle,
        commit_message: input.commitMessage,
      }),
    },
  );

  return {
    merged: result.merged,
    sha: result.sha,
    message: result.message,
  };
}

// ---------------------------------------------------------------------------
// Git Tree / Blob helpers for multi-file atomic commits
// ---------------------------------------------------------------------------

type GitHubBlobResponse = {
  sha: string;
  url: string;
};

type GitHubTreeResponse = {
  sha: string;
  url: string;
};

type GitHubTreeItem = {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha: string;
};

/**
 * Create a single blob in the repo and return its SHA.
 */
async function createBlob(owner: string, repo: string, content: string): Promise<string> {
  const blob = await githubRequest<GitHubBlobResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({
        content: Buffer.from(content, "utf-8").toString("base64"),
        encoding: "base64",
      }),
    },
  );
  return blob.sha;
}

/**
 * Push an array of in-memory files to an existing GitHub repository as a
 * single atomic commit on the given branch.
 *
 * Steps:
 *   1. Resolve HEAD SHA of the branch
 *   2. Create blobs for each file
 *   3. Build a tree referencing all blobs
 *   4. Create a commit pointing at the new tree
 *   5. Update the branch ref to the new commit
 *
 * @returns The SHA of the new commit.
 */
export async function pushFilesToGitHub(input: {
  owner: string;
  repo: string;
  branch: string;
  files: Array<{ path: string; content: string }>;
  commitMessage: string;
}): Promise<{ commitSha: string; htmlUrl?: string }> {
  const { owner, repo, branch, files, commitMessage } = input;

  // 1. Get current HEAD SHA for the branch
  const headSha = await getBranchHeadSha(owner, repo, branch);

  // 2. Get the tree SHA of the current HEAD commit
  const headCommit = await githubRequest<{ tree: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(headSha)}`,
  );
  const baseTreeSha = headCommit.tree.sha;

  // 3. Create blobs for all files in parallel
  const blobShas = await Promise.all(
    files.map((file) => createBlob(owner, repo, file.content)),
  );

  // 4. Build the tree on top of the existing tree
  const treeItems: GitHubTreeItem[] = files.map((file, idx) => ({
    path: file.path,
    mode: "100644",
    type: "blob",
    sha: blobShas[idx],
  }));

  const tree = await githubRequest<GitHubTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    },
  );

  // 5. Create the commit
  const commit = await githubRequest<GitHubCommitObjectResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [headSha],
      }),
    },
  );

  // 6. Fast-forward the branch ref to the new commit
  await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    },
  );

  return { commitSha: commit.sha, htmlUrl: commit.html_url };
}

