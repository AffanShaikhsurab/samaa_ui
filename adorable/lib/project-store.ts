import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RuntimeProviderName = "openai" | "anthropic" | "groq" | "nvidia";

export type BuilderPhase =
  // Legacy build phases (kept for backward compat)
  | "clarifying"
  | "planning"
  | "generating"
  | "building"
  | "fixing"
  | "verifying"
  | "complete"
  | "failed"
  | "researching"
  | "planning_enhancement"
  | "enhancing"
  | "serving"
  | "generating_ancl"
  | "compiling"
  // Discovery pipeline phases
  | "intent_extraction"
  | "domain_research"
  | "screen_architecture"
  | "collecting_questions"
  | "walkthrough"
  | "ancl_generation"
  | "repo_publish"
  | "preview_ready"
  | "deployable";

// ---------------------------------------------------------------------------
// Discovery pipeline types
// ---------------------------------------------------------------------------

export type DomainInsight = {
  query: string;
  source: string;
  summary: string;
  edgeCases: string[];
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  citations?: Array<{
    title: string;
    url: string;
    excerpt: string;
  }>;
  confidence?: number;
  degraded?: boolean;
};

export type FeatureSpec = {
  id: string;
  name: string;
  description: string;
  logic: string;
  edgeCases: string[];
};

export type ScreenHypothesis = {
  id: string;
  name: string;
  purpose: string;
  assumption: string;
  problemSolved: string;
  features: FeatureSpec[];
  userFlow: string;
  edgeCases: string[];
  dataFlow: string;
  navigatesTo: string[];
  validatedByUser: boolean;
  validationStatus?: "pending" | "accepted" | "modified" | "rejected";
  userFeedback?: string;
};

export type ClarificationQuestion = {
  id: string;
  question: string;
  rationale: string;
  suggestedOptions?: string[];
  answer?: string;
};

export type IntentAnalysisResult = {
  coreProblems: string[];
  targetUsers: string[];
  domainKeywords: string[];
  hypotheses: string[];
  suggestedSearchQueries: string[];
};

export type RequirementsDocument = {
  rawIntent: string;
  intentAnalysis: IntentAnalysisResult;
  domainInsights: DomainInsight[];
  screens: ScreenHypothesis[];
  globalEdgeCases: string[];
  userFlowSummary: string;
  dataModel: string;
  validatedAt?: string;
  validation?: {
    walkthroughCompleted: boolean;
    researchAvailable: boolean;
    researchDegraded: boolean;
    researchAcknowledged?: boolean;
    sealedAt?: string;
    screenStates?: Record<string, "pending" | "accepted" | "modified" | "rejected">;
    userCorrections?: Record<string, string>;
  };
};

export type ProjectStatus = "idle" | "running" | "complete" | "failed";

export type BuilderArtifact = {
  kind: string;
  title?: string;
  path?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  provider?: string;
  sourceType?: string;
};

export type ProjectMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ProjectSnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  phase: BuilderPhase;
  prompt: string;
  previewUrl?: string;
  outcome: "success" | "failed" | "partial";
  filesManifest: Array<{ path: string; size?: number }>;
};

export type BuildHistoryEntry = {
  id: string;
  projectId: string;
  createdAt: string;
  action: "generate" | "retry-build" | "repair" | "restore";
  phase: BuilderPhase;
  outcome: "success" | "failed" | "partial";
  note?: string;
};

export type BuildJobAction = "generate" | "retry-build" | "repair";

export type QueueAdmissionReason =
  | "project_active_cap"
  | "global_queue_cap"
  | "provider_concurrency_cap"
  | "project_not_found";

export type QueueAdmissionResult =
  | {
      accepted: true;
      job: BuildJobRecord;
      created: boolean;
      queueDepth: number;
      projectActiveJobs: number;
      providerActiveJobs: number;
    }
  | {
      accepted: false;
      reason: QueueAdmissionReason;
      retryAfterSeconds: number;
      queueDepth: number;
      projectActiveJobs: number;
      providerActiveJobs: number;
    };

export type BuildJobStatus =
  | "queued"
  | "leased"
  | "running"
  | "retry_scheduled"
  | "dead_letter"
  | "succeeded"
  | "failed"
  | "canceled";

export type BuildJobRecord = {
  id: string;
  projectId: string;
  action: BuildJobAction;
  status: BuildJobStatus;
  message: string;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  leaseAt?: string;
  leaseOwnerId?: string;
  leaseVersion: number;
  idempotencyKey?: string;
  retryCount: number;
  maxRetries: number;
  nextAttemptAt?: string;
  terminalReason?: string;
  errorNote?: string;
};

// ---------------------------------------------------------------------------
// Checkpoint system
// ---------------------------------------------------------------------------

/**
 * A sealed record written when a pipeline phase completes successfully.
 * Acts as the single source of truth for "was this phase done?".
 */
export type CheckpointRecord = {
  phase: BuilderPhase;
  completedAt: string; // ISO timestamp
  dataHash?: string;   // optional SHA-256 of the phase output for integrity
  note?: string;       // e.g. "skipped" for inapplicable phases
};

export type DeploymentStatus = "queued" | "running" | "succeeded" | "failed" | "rolled_back";

export type DeploymentRecord = {
  deploymentId: string;
  projectId: string;
  environment: "preview" | "production";
  commitHash: string;
  status: DeploymentStatus;
  provider: "vercel" | "cloudflare";
  url?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rolledBackFromDeploymentId?: string;
  failureReason?: string;
};

export type ProjectRecord = {
  id: string;
  ownerId?: string;
  sessionToken?: string;
  name: string;
  initialPrompt: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  latestPreviewUrl?: string;
  latestPhase: BuilderPhase;
  runtimeProvider?: RuntimeProviderName;
  artifacts: BuilderArtifact[];
  snapshots: ProjectSnapshot[];
  buildHistory: BuildHistoryEntry[];
  deployments: DeploymentRecord[];
  messages: ProjectMessage[];
  lastError?: string;
  runMode?: "strict" | "resilient";
  requirementsHash?: string;
  anclHash?: string;
  flutterHash?: string;
  compilerFingerprint?: string;
  modelConfigFingerprint?: string;
  githubRepositoryUrl?: string;
  githubRepositoryFullName?: string;
  sourceCommitSha?: string;
  remediationBranch?: string;
  remediationPrUrl?: string;
  // Discovery pipeline fields
  requirementsDoc?: RequirementsDocument;
  screenHypotheses?: ScreenHypothesis[];
  currentWalkthroughScreenIndex?: number;
  wireframeHtml?: string;
  clarificationQuestions?: Record<string, ClarificationQuestion[]>;
  discoveryQuestions?: ClarificationQuestion[];
  discoveryAnswers?: Record<string, string>;
  // Generated code
  anclCode?: string;
  flutterCode?: string;
  // Checkpoint records — keyed by BuilderPhase, sealed on phase success
  checkpoints?: Partial<Record<BuilderPhase, CheckpointRecord>>;
};

type ProjectStoreFile = {
  projects: ProjectRecord[];
  buildJobs: BuildJobRecord[];
};

const STORE_DIR = path.join(process.cwd(), ".samaa");
const STORE_FILE = path.join(STORE_DIR, "projects.json");

let writeQueue: Promise<void> = Promise.resolve();
let pendingWriteOperations = 0;
const leaseHeartbeatCache = new Map<string, string>();
const leaseJobStateCache = new Map<string, BuildJobRecord>();

const nowIso = () => new Date().toISOString();

const defaultStore = (): ProjectStoreFile => ({ projects: [], buildJobs: [] });

const ACTIVE_JOB_STATUSES: BuildJobStatus[] = ["queued", "leased", "running", "retry_scheduled"];
const BUILD_JOB_ALLOWED_TRANSITIONS: Record<BuildJobStatus, ReadonlySet<BuildJobStatus>> = {
  queued: new Set(["leased", "running", "canceled"]),
  leased: new Set(["running", "failed", "canceled", "retry_scheduled", "dead_letter"]),
  running: new Set(["succeeded", "failed", "canceled", "retry_scheduled", "dead_letter"]),
  retry_scheduled: new Set(["queued", "canceled"]),
  dead_letter: new Set([]),
  succeeded: new Set([]),
  failed: new Set([]),
  canceled: new Set([]),
};
const DEFAULT_BUILD_JOB_STALE_MS = 30 * 60 * 1000;
const DEFAULT_HEARTBEAT_WRITE_INTERVAL_MS = 10_000;
const DEFAULT_BUILD_JOB_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const DEFAULT_RETRY_MAX_DELAY_MS = 60_000;
const DEFAULT_MAX_PENDING_WRITE_OPS = 1000;

function resolveBuildJobStaleMs(): number {
  const parsed = Number.parseInt(process.env.BUILD_JOB_STALE_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BUILD_JOB_STALE_MS;
  }
  return parsed;
}

function resolveHeartbeatWriteIntervalMs(): number {
  const parsed = Number.parseInt(process.env.BUILD_JOB_HEARTBEAT_WRITE_INTERVAL_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_HEARTBEAT_WRITE_INTERVAL_MS;
  }
  return parsed;
}

function resolveBuildJobMaxRetries(): number {
  const parsed = Number.parseInt(process.env.BUILD_JOB_MAX_RETRIES ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_BUILD_JOB_MAX_RETRIES;
  }
  return parsed;
}

function resolveMaxPendingWriteOps(): number {
  const parsed = Number.parseInt(process.env.PROJECT_STORE_MAX_PENDING_WRITES ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_PENDING_WRITE_OPS;
  }
  return parsed;
}

function shouldPersistHeartbeatLeases(): boolean {
  const configured = process.env.BUILD_JOB_PERSIST_HEARTBEAT?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.CONTROL_PLANE_V2 === "true";
}

function computeFullJitterRetryDelayMs(retryCount: number): number {
  const rawBase = Number.parseInt(process.env.BUILD_JOB_RETRY_BASE_DELAY_MS ?? "", 10);
  const rawMax = Number.parseInt(process.env.BUILD_JOB_RETRY_MAX_DELAY_MS ?? "", 10);
  const baseDelay = Number.isFinite(rawBase) && rawBase > 0 ? rawBase : DEFAULT_RETRY_DELAY_MS;
  const maxDelay = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : DEFAULT_RETRY_MAX_DELAY_MS;

  const exponentialCap = Math.min(maxDelay, baseDelay * 2 ** Math.max(0, retryCount - 1));
  return Math.floor(Math.random() * Math.max(1, exponentialCap));
}

function parseTimeMs(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isJobStale(job: BuildJobRecord, nowMs: number, staleMs: number): boolean {
  const persistedLeaseMs = parseTimeMs(job.leaseAt) ?? parseTimeMs(job.startedAt) ?? parseTimeMs(job.updatedAt);
  const cachedLeaseMs = parseTimeMs(leaseHeartbeatCache.get(job.id));
  const leaseMs = Math.max(persistedLeaseMs ?? 0, cachedLeaseMs ?? 0) || null;
  if (leaseMs === null) return false;
  return nowMs - leaseMs > staleMs;
}

function canRetryJob(job: BuildJobRecord): boolean {
  return job.retryCount < job.maxRetries;
}

function hasStaleRunningJobsForProject(store: ProjectStoreFile, projectId: string, staleMs: number): boolean {
  const nowMs = Date.now();
  return store.buildJobs.some(
    (job) => job.projectId === projectId && job.status === "running" && isJobStale(job, nowMs, staleMs),
  );
}

export function describeBuildJobAllowedTransitions(): Record<BuildJobStatus, BuildJobStatus[]> {
  return {
    queued: [...BUILD_JOB_ALLOWED_TRANSITIONS.queued],
    leased: [...BUILD_JOB_ALLOWED_TRANSITIONS.leased],
    running: [...BUILD_JOB_ALLOWED_TRANSITIONS.running],
    retry_scheduled: [...BUILD_JOB_ALLOWED_TRANSITIONS.retry_scheduled],
    dead_letter: [],
    succeeded: [],
    failed: [],
    canceled: [],
  };
}

export function isBuildJobTransitionAllowed(from: BuildJobStatus, to: BuildJobStatus): boolean {
  if (from === to) return true;
  return BUILD_JOB_ALLOWED_TRANSITIONS[from].has(to);
}

function transitionBuildJobStatus(job: BuildJobRecord, nextStatus: BuildJobStatus, atIso: string): boolean {
  if (!isBuildJobTransitionAllowed(job.status, nextStatus)) {
    return false;
  }
  if (job.status !== nextStatus) {
    job.status = nextStatus;
  }
  job.updatedAt = atIso;
  return true;
}

function getProjectActiveJobs(store: ProjectStoreFile, projectId: string): BuildJobRecord[] {
  return store.buildJobs.filter(
    (job) => job.projectId === projectId && ACTIVE_JOB_STATUSES.includes(job.status),
  );
}

function recoverStaleRunningJobsForProject(
  store: ProjectStoreFile,
  projectId: string,
  now: string,
  staleMs: number,
): number {
  const nowMs = Date.parse(now);
  let recovered = 0;

  for (const job of store.buildJobs) {
    if (job.projectId !== projectId || (job.status !== "running" && job.status !== "leased")) {
      continue;
    }

    if (!isJobStale(job, nowMs, staleMs)) {
      continue;
    }

    if (canRetryJob(job)) {
      job.retryCount += 1;
      if (!transitionBuildJobStatus(job, "retry_scheduled", now)) {
        continue;
      }
      job.nextAttemptAt = new Date(Date.parse(now) + computeFullJitterRetryDelayMs(job.retryCount)).toISOString();
    } else {
      if (!transitionBuildJobStatus(job, "dead_letter", now)) {
        continue;
      }
      job.finishedAt = now;
    }
    job.terminalReason = "lease_timeout";
    job.errorNote = "Build job lease expired before completion.";
    recovered += 1;
  }

  if (recovered > 0) {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (project) {
      const activeJobs = getProjectActiveJobs(store, projectId);
      if (activeJobs.length > 0) {
        project.status = "running";
        const active = activeJobs.find((entry) => entry.status !== "retry_scheduled") ?? activeJobs[0];
        project.latestPhase = phaseForAction(active.action);
      } else {
        project.status = "failed";
        project.latestPhase = "failed";
        project.lastError = "A previous build job timed out and was marked failed.";
      }
      project.updatedAt = now;
    }
  }

  return recovered;
}

function promoteReadyRetriesForProject(store: ProjectStoreFile, projectId: string, nowMs: number): number {
  let promoted = 0;
  const nowIsoValue = new Date(nowMs).toISOString();
  for (const job of store.buildJobs) {
    if (job.projectId !== projectId || job.status !== "retry_scheduled") {
      continue;
    }
    const nextAttemptMs = parseTimeMs(job.nextAttemptAt) ?? 0;
    if (nextAttemptMs > nowMs) {
      continue;
    }
    if (!transitionBuildJobStatus(job, "queued", nowIsoValue)) {
      continue;
    }
    job.nextAttemptAt = undefined;
    promoted += 1;
  }
  return promoted;
}

function normalizeName(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Untitled Flutter Project";
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

async function ensureStoreFile(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf-8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(defaultStore(), null, 2), "utf-8");
  }
}

async function readStore(): Promise<ProjectStoreFile> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ProjectStoreFile>;
    if (!Array.isArray(parsed.projects)) {
      return defaultStore();
    }
    return {
      projects: parsed.projects,
      buildJobs: Array.isArray(parsed.buildJobs) ? parsed.buildJobs : [],
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(data: ProjectStoreFile): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function withWriteLock<T>(fn: (store: ProjectStoreFile) => T | Promise<T>): Promise<T> {
  if (pendingWriteOperations >= resolveMaxPendingWriteOps()) {
    throw new Error("Project store is overloaded; too many pending write operations.");
  }

  pendingWriteOperations += 1;
  const run = writeQueue.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run.finally(() => {
    pendingWriteOperations = Math.max(0, pendingWriteOperations - 1);
  });
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const store = await readStore();
  return [...store.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listProjectsForOwner(ownerId: string): Promise<ProjectRecord[]> {
  const store = await readStore();
  return store.projects
    .filter((project) => project.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectById(projectId: string): Promise<ProjectRecord | null> {
  const store = await readStore();
  return store.projects.find((project) => project.id === projectId) ?? null;
}

export async function getProjectByIdForOwner(projectId: string, ownerId: string): Promise<ProjectRecord | null> {
  const store = await readStore();
  const project = store.projects.find((entry) => entry.id === projectId);
  if (!project) return null;
  if (!project.ownerId || project.ownerId !== ownerId) {
    return null;
  }
  return project;
}

export async function createProject(input: {
  ownerId?: string;
  name?: string;
  initialPrompt: string;
  runtimeProvider?: RuntimeProviderName;
}): Promise<ProjectRecord> {
  return withWriteLock(async (store) => {
    const createdAt = nowIso();
    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      sessionToken: crypto.randomUUID(),
      name: input.name?.trim() || normalizeName(input.initialPrompt),
      initialPrompt: input.initialPrompt,
      status: "idle",
      createdAt,
      updatedAt: createdAt,
      latestPhase: "clarifying",
      runtimeProvider: input.runtimeProvider,
      artifacts: [],
      snapshots: [],
      buildHistory: [],
      deployments: [],
      messages: [],
    };
    store.projects.push(project);
    return project;
  });
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<ProjectRecord, "name" | "status" | "latestPreviewUrl" | "latestPhase" | "runtimeProvider" | "lastError">>,
): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    if (patch.name !== undefined) project.name = patch.name;
    if (patch.status !== undefined) project.status = patch.status;
    if (patch.latestPreviewUrl !== undefined) project.latestPreviewUrl = patch.latestPreviewUrl;
    if (patch.latestPhase !== undefined) project.latestPhase = patch.latestPhase;
    if (patch.runtimeProvider !== undefined) project.runtimeProvider = patch.runtimeProvider;
    if (patch.lastError !== undefined) project.lastError = patch.lastError;

    project.updatedAt = nowIso();
    return project;
  });
}

export async function updateProjectGitMetadata(
  projectId: string,
  patch: Partial<
    Pick<
      ProjectRecord,
      "githubRepositoryUrl" | "githubRepositoryFullName" | "sourceCommitSha" | "remediationBranch" | "remediationPrUrl"
    >
  >,
): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    if (Object.prototype.hasOwnProperty.call(patch, "githubRepositoryUrl")) {
      project.githubRepositoryUrl = patch.githubRepositoryUrl;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "githubRepositoryFullName")) {
      project.githubRepositoryFullName = patch.githubRepositoryFullName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "sourceCommitSha")) {
      project.sourceCommitSha = patch.sourceCommitSha;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "remediationBranch")) {
      project.remediationBranch = patch.remediationBranch;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "remediationPrUrl")) {
      project.remediationPrUrl = patch.remediationPrUrl;
    }

    project.updatedAt = nowIso();
    return project;
  });
}

export async function deleteProject(projectId: string): Promise<boolean> {
  return withWriteLock(async (store) => {
    const before = store.projects.length;
    store.projects = store.projects.filter((entry) => entry.id !== projectId);
    return store.projects.length < before;
  });
}

// ---------------------------------------------------------------------------
// Checkpoint store functions
// ---------------------------------------------------------------------------

/**
 * Seal a phase checkpoint. Idempotent — if already sealed, updates the hash
 * but keeps the original completedAt timestamp so the timeline stays accurate.
 */
export async function sealPhaseCheckpoint(
  projectId: string,
  phase: BuilderPhase,
  dataHash?: string,
): Promise<void> {
  await withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return;
    if (!project.checkpoints) project.checkpoints = {};
    const existing = project.checkpoints[phase];
    project.checkpoints[phase] = {
      phase,
      completedAt: existing?.completedAt ?? nowIso(),
      dataHash: dataHash ?? existing?.dataHash,
    };
    project.updatedAt = nowIso();
  });
}

/**
 * Clear a phase checkpoint so it can be re-run in a targeted retry.
 */
export async function clearPhaseCheckpoint(
  projectId: string,
  phase: BuilderPhase,
): Promise<void> {
  await withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project?.checkpoints) return;
    delete project.checkpoints[phase];
    project.updatedAt = nowIso();
  });
}

/**
 * Read all checkpoint records for a project.
 */
export async function getProjectCheckpoints(
  projectId: string,
): Promise<Partial<Record<BuilderPhase, CheckpointRecord>>> {
  const store = await readStore();
  const project = store.projects.find((entry) => entry.id === projectId);
  return project?.checkpoints ?? {};
}

export async function duplicateProject(projectId: string): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const source = store.projects.find((entry) => entry.id === projectId);
    if (!source) return null;

    const createdAt = nowIso();
    const clone: ProjectRecord = {
      ...source,
      id: crypto.randomUUID(),
      sessionToken: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      createdAt,
      updatedAt: createdAt,
      messages: source.messages.map((msg) => ({ ...msg, id: crypto.randomUUID() })),
      artifacts: source.artifacts.map((artifact) => ({ ...artifact })),
      snapshots: source.snapshots.map((snapshot) => ({
        ...snapshot,
        id: crypto.randomUUID(),
        projectId: "",
      })),
      buildHistory: source.buildHistory.map((entry) => ({
        ...entry,
        id: crypto.randomUUID(),
        projectId: "",
      })),
      deployments: source.deployments.map((deployment) => ({
        ...deployment,
        deploymentId: crypto.randomUUID(),
        projectId: "",
        createdAt: createdAt,
        updatedAt: createdAt,
      })),
    };

    clone.snapshots = clone.snapshots.map((snapshot) => ({ ...snapshot, projectId: clone.id }));
    clone.buildHistory = clone.buildHistory.map((entry) => ({ ...entry, projectId: clone.id }));
    clone.deployments = clone.deployments.map((entry) => ({ ...entry, projectId: clone.id }));

    store.projects.push(clone);
    return clone;
  });
}

export async function appendProjectMessage(
  projectId: string,
  message: Omit<ProjectMessage, "id" | "createdAt">,
): Promise<ProjectMessage | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const next: ProjectMessage = {
      id: crypto.randomUUID(),
      role: message.role,
      content: message.content,
      createdAt: nowIso(),
    };

    project.messages.push(next);
    project.messages = project.messages.slice(-200);
    project.updatedAt = nowIso();
    return next;
  });
}

// ---------------------------------------------------------------------------
// Discovery pipeline helpers
// ---------------------------------------------------------------------------

const DISCOVERY_STARTABLE_PHASES = new Set<BuilderPhase>([
  "intent_extraction",
  "domain_research",
  "screen_architecture",
  "failed",
]);

export function areRequirementsSealed(project: Pick<ProjectRecord, "requirementsDoc"> | null | undefined): boolean {
  return Boolean(
    project?.requirementsDoc?.validation?.walkthroughCompleted &&
      project?.requirementsDoc?.validation?.sealedAt,
  );
}

export function hasUnansweredDiscoveryQuestions(
  project:
    | Pick<ProjectRecord, "discoveryQuestions" | "discoveryAnswers">
    | null
    | undefined,
): boolean {
  const questions = project?.discoveryQuestions ?? [];
  if (questions.length === 0) return false;
  const answers = project?.discoveryAnswers ?? {};
  return questions.some((question) => {
    const answer = answers[question.id];
    return !answer || !answer.trim();
  });
}

function normalizeDiscoveryQuestions(
  clarificationQuestions: Record<string, ClarificationQuestion[]>,
): ClarificationQuestion[] {
  const result: ClarificationQuestion[] = [];

  for (const [screenId, questions] of Object.entries(clarificationQuestions)) {
    for (const question of questions) {
      const normalizedId = `${screenId}::${question.id}`;
      result.push({
        id: normalizedId,
        question: question.question,
        rationale: question.rationale,
        suggestedOptions: question.suggestedOptions,
      });
    }
  }

  return result;
}

export async function beginDiscoveryRun(
  projectId: string,
  initialUserMessage?: string,
): Promise<{ ok: true; project: ProjectRecord } | { ok: false; reason: string }> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) {
      return { ok: false, reason: "project_not_found" };
    }

    if (!DISCOVERY_STARTABLE_PHASES.has(project.latestPhase)) {
      return {
        ok: false,
        reason: `Discovery can only start from ${[...DISCOVERY_STARTABLE_PHASES].join(", ")}. Current phase: ${project.latestPhase}.`,
      };
    }

    if (project.status === "running") {
      return { ok: false, reason: "Discovery already running for this project." };
    }

    if (areRequirementsSealed(project)) {
      return { ok: false, reason: "Requirements are already sealed. Start a new project to rediscover." };
    }

    project.latestPhase = "intent_extraction";
    project.status = "running";
    if (initialUserMessage?.trim()) {
      project.messages.push({
        id: crypto.randomUUID(),
        role: "user",
        content: initialUserMessage.trim(),
        createdAt: nowIso(),
      });
      project.messages = project.messages.slice(-200);
    }
    project.updatedAt = nowIso();
    return { ok: true, project };
  });
}

export async function acknowledgeDegradedResearch(projectId: string): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project?.requirementsDoc) return null;

    project.requirementsDoc.validation = {
      walkthroughCompleted: project.requirementsDoc.validation?.walkthroughCompleted ?? false,
      researchAvailable: project.requirementsDoc.validation?.researchAvailable ?? true,
      researchDegraded: project.requirementsDoc.validation?.researchDegraded ?? false,
      researchAcknowledged: true,
      sealedAt: project.requirementsDoc.validation?.sealedAt,
      screenStates: project.requirementsDoc.validation?.screenStates ?? {},
      userCorrections: project.requirementsDoc.validation?.userCorrections ?? {},
    };

    project.latestPhase = "walkthrough";
    project.status = "idle";
    project.lastError = undefined;
    project.updatedAt = nowIso();
    return project;
  });
}

export async function saveDiscoveryResults(
  projectId: string,
  input: {
    screenHypotheses: ScreenHypothesis[];
    requirementsDoc: Omit<RequirementsDocument, "validatedAt">;
    wireframeHtml: string;
    clarificationQuestions: Record<string, ClarificationQuestion[]>;
    phase?: BuilderPhase;
  },
): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const normalizedScreens = input.screenHypotheses.map((screen) => ({
      ...screen,
      validatedByUser: false,
      validationStatus: "pending" as const,
    }));
    const requirements = input.requirementsDoc as RequirementsDocument;
    const baseValidation = requirements.validation;

    project.screenHypotheses = normalizedScreens;
    project.requirementsDoc = {
      ...requirements,
      screens: normalizedScreens,
      validatedAt: undefined,
      validation: {
        walkthroughCompleted: false,
        researchAvailable: baseValidation?.researchAvailable ?? true,
        researchDegraded: baseValidation?.researchDegraded ?? false,
        researchAcknowledged:
          baseValidation?.researchAcknowledged ?? !(baseValidation?.researchDegraded ?? false),
        sealedAt: undefined,
        screenStates: Object.fromEntries(normalizedScreens.map((screen) => [screen.id, "pending"])),
        userCorrections: {},
      },
    };
    project.wireframeHtml = input.wireframeHtml;
    project.clarificationQuestions = input.clarificationQuestions;
    project.currentWalkthroughScreenIndex = 0;
    project.latestPhase = input.phase ?? "walkthrough";
    project.status = "idle";
    project.updatedAt = nowIso();
    return project;
  });
}

function prependArtifact(project: ProjectRecord, artifact: BuilderArtifact): void {
  project.artifacts.unshift(artifact);
  project.artifacts = project.artifacts.slice(0, 200);
}

export async function finalizeDiscoveryRun(
  projectId: string,
  input: {
    screenHypotheses: ScreenHypothesis[];
    requirementsDoc: Omit<RequirementsDocument, "validatedAt">;
    wireframeHtml: string;
    clarificationQuestions: Record<string, ClarificationQuestion[]>;
    researchAvailable: boolean;
    researchDegraded: boolean;
    blocked: boolean;
    acknowledgedDegradedResearch: boolean;
  },
): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const normalizedScreens = input.screenHypotheses.map((screen) => ({
      ...screen,
      validatedByUser: false,
      validationStatus: "pending" as const,
    }));
    const requirements = input.requirementsDoc as RequirementsDocument;
    const baseValidation = requirements.validation;

    project.screenHypotheses = normalizedScreens;
    project.requirementsDoc = {
      ...requirements,
      screens: normalizedScreens,
      validatedAt: undefined,
      validation: {
        walkthroughCompleted: false,
        researchAvailable: input.researchAvailable,
        researchDegraded: input.researchDegraded,
        researchAcknowledged:
          input.acknowledgedDegradedResearch ||
          baseValidation?.researchAcknowledged ||
          !input.researchDegraded,
        sealedAt: undefined,
        screenStates: Object.fromEntries(normalizedScreens.map((screen) => [screen.id, "pending"])),
        userCorrections: {},
      },
    };
    project.wireframeHtml = input.wireframeHtml;
    project.clarificationQuestions = input.clarificationQuestions;
    const discoveryQuestions = normalizeDiscoveryQuestions(input.clarificationQuestions);
    project.discoveryQuestions = discoveryQuestions;
    project.discoveryAnswers = Object.fromEntries(
      discoveryQuestions.map((question) => [question.id, ""]),
    );
    project.currentWalkthroughScreenIndex = 0;

    prependArtifact(project, {
      kind: "requirements",
      title: "Draft requirements",
      content: JSON.stringify(project.requirementsDoc, null, 2),
    });
    prependArtifact(project, {
      kind: "wireframe",
      title: "Discovery wireframe",
      content: input.wireframeHtml,
    });
    prependArtifact(project, {
      kind: "research_bundle",
      title: "Domain research bundle",
      content: JSON.stringify(
        {
          domainInsights: project.requirementsDoc.domainInsights,
          researchAvailable: input.researchAvailable,
          researchDegraded: input.researchDegraded,
        },
        null,
        2,
      ),
    });

    if (input.blocked) {
      project.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Automatic research ran in degraded mode. Review evidence and confirm before walkthrough can continue.",
        createdAt: nowIso(),
      });
      project.messages = project.messages.slice(-200);
      project.latestPhase = "domain_research";
      project.status = "idle";
      project.lastError = "Research unavailable/degraded. Explicit confirmation required.";
    } else {
      project.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          discoveryQuestions.length > 0
            ? `I analysed your idea and designed ${normalizedScreens.length} screens. Before walkthrough, answer ${discoveryQuestions.length} clarification question${discoveryQuestions.length === 1 ? "" : "s"} so ANCL generation stays deterministic.`
            : `I've analysed your idea and designed ${normalizedScreens.length} screens. Let's walk through each one and make sure everything is right.`,
        createdAt: nowIso(),
      });
      project.messages = project.messages.slice(-200);
      project.latestPhase = discoveryQuestions.length > 0 ? "collecting_questions" : "walkthrough";
      project.status = "idle";
      project.lastError = undefined;
    }

    project.updatedAt = nowIso();
    return project;
  });
}

export async function answerDiscoveryQuestions(
  projectId: string,
  answers: Record<string, string>,
): Promise<
  | { ok: true; project: ProjectRecord }
  | { ok: false; reason: "project_not_found" | "invalid_phase" | "missing_answers" }
> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) {
      return { ok: false, reason: "project_not_found" };
    }

    if (project.latestPhase !== "collecting_questions") {
      return { ok: false, reason: "invalid_phase" };
    }

    const questions = project.discoveryQuestions ?? [];
    if (questions.length === 0) {
      project.latestPhase = "walkthrough";
      project.updatedAt = nowIso();
      return { ok: true, project };
    }

    const mergedAnswers: Record<string, string> = {
      ...(project.discoveryAnswers ?? {}),
    };
    for (const question of questions) {
      const incoming = answers[question.id];
      if (typeof incoming === "string" && incoming.trim()) {
        mergedAnswers[question.id] = incoming.trim();
      }
    }

    const missing = questions.some((question) => !mergedAnswers[question.id]?.trim());
    if (missing) {
      project.discoveryAnswers = mergedAnswers;
      project.updatedAt = nowIso();
      return { ok: false, reason: "missing_answers" };
    }

    project.discoveryAnswers = mergedAnswers;
    project.latestPhase = "walkthrough";
    project.status = "idle";
    project.lastError = undefined;
    project.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Thanks. Clarification answers are sealed for this run. Walkthrough is now unlocked so we can validate screens before ANCL generation.",
      createdAt: nowIso(),
    });
    project.messages = project.messages.slice(-200);
    project.updatedAt = nowIso();

    return { ok: true, project };
  });
}

export async function applyWalkthroughFeedback(
  projectId: string,
  input: {
    screenId: string;
    action: "accept" | "modify" | "reject";
    feedback?: string;
    answers?: Record<string, string>; // questionId -> answer
  },
): Promise<{
  project: ProjectRecord;
  nextScreen: ScreenHypothesis | null;
  isComplete: boolean;
} | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project || !project.screenHypotheses || !project.requirementsDoc) return null;

    if (project.latestPhase !== "walkthrough") return null;
    if (areRequirementsSealed(project)) return null;

    const requiresAcknowledgement =
      project.requirementsDoc.validation?.researchDegraded === true &&
      project.requirementsDoc.validation?.researchAcknowledged !== true;
    if (requiresAcknowledgement) return null;

    const screenIndex = project.screenHypotheses.findIndex((s) => s.id === input.screenId);
    if (screenIndex === -1) return null;

    const screen = project.screenHypotheses[screenIndex];

    if (input.action === "accept" || input.action === "modify") {
      screen.validatedByUser = true;
      screen.validationStatus = input.action === "accept" ? "accepted" : "modified";
      if (input.feedback) screen.userFeedback = input.feedback;
    } else {
      // Rejection keeps the walkthrough open; this screen must be revised and accepted.
      screen.validatedByUser = false;
      screen.validationStatus = "rejected";
      screen.userFeedback = `[REJECTED] ${input.feedback ?? "User rejected this screen. Needs rework."}`;
    }

    // Save answers to clarification questions
    if (input.answers && project.clarificationQuestions?.[input.screenId]) {
      project.clarificationQuestions[input.screenId] = project.clarificationQuestions[
        input.screenId
      ].map((q) => ({
        ...q,
        answer: input.answers![q.id] ?? q.answer,
      }));
    }

    // Advance to next screen that is not explicitly accepted/modified yet.
    const nextScreen =
      project.screenHypotheses.find((s) => s.validationStatus !== "accepted" && s.validationStatus !== "modified") ?? null;

    project.currentWalkthroughScreenIndex = nextScreen
      ? project.screenHypotheses.indexOf(nextScreen)
      : project.screenHypotheses.length;

    const allApproved = project.screenHypotheses.every(
      (s) => s.validationStatus === "accepted" || s.validationStatus === "modified",
    );

    const currentStates = project.requirementsDoc.validation?.screenStates ?? {};
    const currentCorrections = project.requirementsDoc.validation?.userCorrections ?? {};
    const nextStatus = input.action === "accept" ? "accepted" : input.action === "modify" ? "modified" : "rejected";
    project.requirementsDoc.screens = project.screenHypotheses;
    project.requirementsDoc.validation = {
      walkthroughCompleted: allApproved,
      researchAvailable: project.requirementsDoc.validation?.researchAvailable ?? true,
      researchDegraded: project.requirementsDoc.validation?.researchDegraded ?? false,
      researchAcknowledged: project.requirementsDoc.validation?.researchAcknowledged,
      sealedAt: allApproved ? nowIso() : undefined,
      screenStates: {
        ...currentStates,
        [input.screenId]: nextStatus,
      },
      userCorrections: input.feedback
        ? {
            ...currentCorrections,
            [input.screenId]: input.feedback,
          }
        : currentCorrections,
    };

    if (allApproved) {
      // Seal the requirements document
      project.requirementsDoc.validatedAt = nowIso();
      project.latestPhase = "ancl_generation";
      project.status = "idle";
      // Seal the walkthrough checkpoint inside the write lock
      if (!project.checkpoints) project.checkpoints = {};
      project.checkpoints["walkthrough"] = {
        phase: "walkthrough",
        completedAt: nowIso(),
      };
    } else {
      project.latestPhase = "walkthrough";
      project.status = "idle";
    }

    project.updatedAt = nowIso();
    return { project, nextScreen, isComplete: allApproved };
  });
}

export async function getDiscoveryState(projectId: string): Promise<{
  screenHypotheses: ScreenHypothesis[];
  currentIndex: number;
  wireframeHtml: string;
  requirementsDoc: RequirementsDocument | null;
  clarificationQuestions: Record<string, ClarificationQuestion[]>;
  discoveryQuestions: ClarificationQuestion[];
  discoveryAnswers: Record<string, string>;
} | null> {
  const store = await readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return null;
  return {
    screenHypotheses: project.screenHypotheses ?? [],
    currentIndex: project.currentWalkthroughScreenIndex ?? 0,
    wireframeHtml: project.wireframeHtml ?? "",
    requirementsDoc: project.requirementsDoc ?? null,
    clarificationQuestions: project.clarificationQuestions ?? {},
    discoveryQuestions: project.discoveryQuestions ?? [],
    discoveryAnswers: project.discoveryAnswers ?? {},
  };
}

export async function saveAnclResult(
  projectId: string,
  input: {
    anclCode: string;
    flutterCode: string;
    compilationSucceeded: boolean;
    compilationError?: string;
  },
): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    project.anclCode = input.anclCode;
    project.flutterCode = input.flutterCode;

    if (input.compilationSucceeded && input.flutterCode) {
      project.latestPhase = "fixing";
      project.status = "running";
    } else if (!input.compilationSucceeded) {
      // Even if compilation failed we still move to fixing — the remediation
      // agent will attempt to recover the code from the ANCL description.
      project.latestPhase = "fixing";
      project.status = "running";
      project.lastError = input.compilationError;
    }

    project.updatedAt = nowIso();
    return project;
  });
}

function phaseForAction(action: BuildJobAction): BuilderPhase {
  if (action === "repair") return "fixing";
  if (action === "retry-build") return "building";
  return "planning";
}

export async function getBuildJobById(jobId: string): Promise<BuildJobRecord | null> {
  const store = await readStore();
  return store.buildJobs.find((job) => job.id === jobId) ?? null;
}

export async function listBuildJobsForProject(projectId: string): Promise<BuildJobRecord[]> {
  const store = await readStore();
  return store.buildJobs
    .filter((job) => job.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listBuildJobs(): Promise<BuildJobRecord[]> {
  const store = await readStore();
  return [...store.buildJobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getControlPlaneSnapshot(): Promise<{ projects: ProjectRecord[]; buildJobs: BuildJobRecord[] }> {
  const store = await readStore();
  return {
    projects: store.projects,
    buildJobs: store.buildJobs,
  };
}

function enqueueBuildJobInStore(
  store: ProjectStoreFile,
  input: {
    projectId: string;
    action: BuildJobAction;
    message: string;
    idempotencyKey?: string;
  },
): { job: BuildJobRecord; created: boolean } | null {
  const project = store.projects.find((entry) => entry.id === input.projectId);
  if (!project) return null;

  const now = nowIso();

  if (input.idempotencyKey) {
    const duplicate = store.buildJobs.find(
      (job) => job.projectId === input.projectId && job.idempotencyKey === input.idempotencyKey,
    );
    if (duplicate) {
      return { job: duplicate, created: false };
    }
  }

  const running = store.buildJobs.find(
    (job) =>
      job.projectId === input.projectId &&
      (job.status === "running" || job.status === "leased" || job.status === "retry_scheduled"),
  );
  if (running) {
    return { job: running, created: false };
  }

  const queued = store.buildJobs.find(
    (job) => job.projectId === input.projectId && (job.status === "queued" || job.status === "retry_scheduled"),
  );
  if (queued) {
    if (queued.action === input.action && queued.message === input.message) {
      return { job: queued, created: false };
    }

    queued.action = input.action;
    queued.message = input.message;
    queued.idempotencyKey = input.idempotencyKey;
    if (!transitionBuildJobStatus(queued, "queued", now)) {
      return { job: queued, created: false };
    }
    queued.terminalReason = undefined;
    queued.errorNote = undefined;
    queued.nextAttemptAt = undefined;

    project.status = "running";
    project.latestPhase = phaseForAction(input.action);
    project.lastError = "";
    project.updatedAt = now;

    return { job: queued, created: false };
  }

  const job: BuildJobRecord = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    action: input.action,
    status: "queued",
    message: input.message,
    attempt: 0,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    leaseVersion: 0,
    retryCount: 0,
    maxRetries: resolveBuildJobMaxRetries(),
  };

  store.buildJobs.push(job);
  store.buildJobs = store.buildJobs.slice(-2000);

  project.status = "running";
  project.latestPhase = phaseForAction(input.action);
  project.lastError = "";
  project.updatedAt = now;

  return { job, created: true };
}

export async function admitAndEnqueueBuildJob(input: {
  projectId: string;
  action: BuildJobAction;
  message: string;
  idempotencyKey?: string;
  projectActiveCap: number;
  globalQueueCap: number;
  providerConcurrencyCap: number;
  retryAfterSeconds: number;
}): Promise<QueueAdmissionResult> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === input.projectId);
    if (!project) {
      return {
        accepted: false,
        reason: "project_not_found",
        retryAfterSeconds: input.retryAfterSeconds,
        queueDepth: 0,
        projectActiveJobs: 0,
        providerActiveJobs: 0,
      };
    }

    const targetProvider = project.runtimeProvider ?? "openai";
    const providerByProject = new Map(
      store.projects.map((entry) => [entry.id, entry.runtimeProvider ?? "openai"]),
    );

    let queueDepth = 0;
    let projectActiveJobs = 0;
    let providerActiveJobs = 0;
    for (const job of store.buildJobs) {
      if (!ACTIVE_JOB_STATUSES.includes(job.status)) continue;
      queueDepth += 1;
      if (job.projectId === input.projectId) {
        projectActiveJobs += 1;
      }
      const provider = providerByProject.get(job.projectId) ?? "openai";
      if (provider === targetProvider) {
        providerActiveJobs += 1;
      }
    }

    if (projectActiveJobs >= input.projectActiveCap) {
      return {
        accepted: false,
        reason: "project_active_cap",
        retryAfterSeconds: input.retryAfterSeconds,
        queueDepth,
        projectActiveJobs,
        providerActiveJobs,
      };
    }

    if (queueDepth >= input.globalQueueCap) {
      return {
        accepted: false,
        reason: "global_queue_cap",
        retryAfterSeconds: input.retryAfterSeconds,
        queueDepth,
        projectActiveJobs,
        providerActiveJobs,
      };
    }

    if (providerActiveJobs >= input.providerConcurrencyCap) {
      return {
        accepted: false,
        reason: "provider_concurrency_cap",
        retryAfterSeconds: input.retryAfterSeconds,
        queueDepth,
        projectActiveJobs,
        providerActiveJobs,
      };
    }

    const enqueued = enqueueBuildJobInStore(store, {
      projectId: input.projectId,
      action: input.action,
      message: input.message,
      idempotencyKey: input.idempotencyKey,
    });

    if (!enqueued) {
      return {
        accepted: false,
        reason: "project_not_found",
        retryAfterSeconds: input.retryAfterSeconds,
        queueDepth,
        projectActiveJobs,
        providerActiveJobs,
      };
    }

    return {
      accepted: true,
      job: enqueued.job,
      created: enqueued.created,
      queueDepth,
      projectActiveJobs,
      providerActiveJobs,
    };
  });
}

export async function enqueueBuildJob(input: {
  projectId: string;
  action: BuildJobAction;
  message: string;
  idempotencyKey?: string;
}): Promise<{ job: BuildJobRecord; created: boolean } | null> {
  return withWriteLock(async (store) => enqueueBuildJobInStore(store, input));
}

export async function claimQueuedBuildJob(
  projectId: string,
  jobId: string,
  leaseOwnerId = "worker-local",
): Promise<BuildJobRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const now = nowIso();

    const job = store.buildJobs.find((entry) => entry.id === jobId && entry.projectId === projectId);
    if (!job) return null;

    if (job.status !== "queued") {
      return null;
    }

    const running = store.buildJobs.find(
      (entry) =>
        entry.projectId === projectId &&
        (entry.status === "running" || entry.status === "leased") &&
        entry.id !== job.id,
    );
    if (running) {
      return null;
    }

    if (!transitionBuildJobStatus(job, "leased", now)) {
      return null;
    }
    job.startedAt = job.startedAt ?? now;
    job.leaseAt = now;
    job.leaseOwnerId = leaseOwnerId;
    job.leaseVersion += 1;
    job.attempt += 1;

    // Promote to running in the same atomic write once lease is captured.
    if (!transitionBuildJobStatus(job, "running", now)) {
      return null;
    }
    leaseJobStateCache.set(job.id, { ...job });

    project.status = "running";
    project.latestPhase = phaseForAction(job.action);
    project.updatedAt = now;

    return job;
  });
}

export async function completeBuildJob(
  jobId: string,
  patch: {
    status: Exclude<BuildJobStatus, "queued" | "leased" | "running" | "retry_scheduled">;
    terminalReason?: string;
    errorNote?: string;
    latestPreviewUrl?: string;
  },
): Promise<BuildJobRecord | null> {
  return withWriteLock(async (store) => {
    const job = store.buildJobs.find((entry) => entry.id === jobId);
    if (!job) return null;

    const now = nowIso();
    if (!transitionBuildJobStatus(job, patch.status, now)) {
      return null;
    }
    job.finishedAt = now;
    job.leaseAt = now;
    job.terminalReason = patch.terminalReason;
    job.errorNote = patch.errorNote;
    leaseHeartbeatCache.delete(job.id);
    leaseJobStateCache.delete(job.id);

    const project = store.projects.find((entry) => entry.id === job.projectId);
    if (project) {
      if (patch.latestPreviewUrl !== undefined) {
        project.latestPreviewUrl = patch.latestPreviewUrl;
      }

      const activeJobs = getProjectActiveJobs(store, job.projectId);
      if (activeJobs.length > 0) {
        project.status = "running";
          const active = activeJobs.find((entry) => entry.status !== "retry_scheduled") ?? activeJobs[0];
          project.latestPhase = phaseForAction(active.action);
        if (patch.status === "failed" && patch.errorNote) {
          project.lastError = patch.errorNote;
        }
      } else if (patch.status === "succeeded") {
        project.status = "complete";
        project.latestPhase = "complete";
        project.lastError = undefined;
      } else if (patch.status === "failed") {
        project.status = "failed";
        project.latestPhase = "failed";
        project.lastError = patch.errorNote || patch.terminalReason || "Build job failed.";
      } else if (patch.status === "canceled") {
        project.status = "idle";
      } else if (patch.status === "dead_letter") {
        project.status = "failed";
        project.latestPhase = "failed";
        project.lastError = patch.errorNote || patch.terminalReason || "Build job moved to dead letter queue.";
      }

      project.updatedAt = now;
    }

    return job;
  });
}

export async function touchBuildJobLease(jobId: string): Promise<BuildJobRecord | null> {
  let snapshot = leaseJobStateCache.get(jobId) ?? null;
  if (!snapshot) {
    snapshot = await getBuildJobById(jobId);
    if (snapshot) {
      leaseJobStateCache.set(jobId, { ...snapshot });
    }
  }

  if (!snapshot || (snapshot.status !== "running" && snapshot.status !== "leased")) {
    leaseJobStateCache.delete(jobId);
    return null;
  }

  const now = nowIso();
  leaseHeartbeatCache.set(jobId, now);
  const cached = { ...snapshot, leaseAt: now, updatedAt: now };
  leaseJobStateCache.set(jobId, cached);

  if (!shouldPersistHeartbeatLeases()) {
    return cached;
  }

  const leaseMs = parseTimeMs(snapshot.leaseAt);
  if (leaseMs !== null && Date.now() - leaseMs < resolveHeartbeatWriteIntervalMs()) {
    return cached;
  }

  return withWriteLock(async (store) => {
    const job = store.buildJobs.find((entry) => entry.id === jobId);
    if (!job || (job.status !== "running" && job.status !== "leased")) {
      return null;
    }

    job.leaseAt = now;
    job.updatedAt = now;

    const updated = { ...job };
    leaseJobStateCache.set(jobId, updated);
    return updated;
  });
}

export async function scheduleBuildJobRetry(jobId: string, errorNote?: string): Promise<BuildJobRecord | null> {
  return withWriteLock(async (store) => {
    const job = store.buildJobs.find((entry) => entry.id === jobId);
    if (!job) return null;
    if (job.status !== "running" && job.status !== "leased") {
      return job;
    }

    const now = nowIso();
    leaseHeartbeatCache.delete(job.id);
    leaseJobStateCache.delete(job.id);
    job.retryCount += 1;
    job.updatedAt = now;
    job.errorNote = errorNote;

    if (job.retryCount > job.maxRetries) {
      if (!transitionBuildJobStatus(job, "dead_letter", now)) {
        return null;
      }
      job.finishedAt = now;
      job.terminalReason = "retry_budget_exhausted";
    } else {
      const retryAt = new Date(Date.parse(now) + computeFullJitterRetryDelayMs(job.retryCount)).toISOString();
      if (!transitionBuildJobStatus(job, "retry_scheduled", now)) {
        return null;
      }
      job.nextAttemptAt = retryAt;
      job.terminalReason = "retry_scheduled";
    }

    const project = store.projects.find((entry) => entry.id === job.projectId);
    if (project) {
      // job.status was mutated by transitionBuildJobStatus, but TS has narrowed it
      // to "running" | "leased" from the guard above. String() escapes the narrowed type.
      if (String(job.status) === "dead_letter") {
        project.status = "failed";
        project.latestPhase = "failed";
        project.lastError = errorNote ?? "Build moved to dead letter queue after retries.";
      } else {
        project.status = "running";
        project.latestPhase = phaseForAction(job.action);
      }
      project.updatedAt = now;
    }

    return job;
  });
}

export async function sweepStaleBuildJobs(): Promise<{ recovered: number; deadLettered: number }> {
  return withWriteLock(async (store) => {
    const staleMs = resolveBuildJobStaleMs();
    const now = nowIso();
    const nowMs = Date.parse(now);
    let recovered = 0;
    let deadLettered = 0;

    const touchedProjectIds = new Set<string>();

    for (const job of store.buildJobs) {
      if (job.status === "running" || job.status === "leased") {
        if (isJobStale(job, nowMs, staleMs)) {
          touchedProjectIds.add(job.projectId);
          recovered += 1;
          leaseJobStateCache.delete(job.id);
          if (canRetryJob(job)) {
            job.retryCount += 1;
            if (!transitionBuildJobStatus(job, "retry_scheduled", now)) {
              continue;
            }
            job.nextAttemptAt = new Date(nowMs + computeFullJitterRetryDelayMs(job.retryCount)).toISOString();
          } else {
            if (!transitionBuildJobStatus(job, "dead_letter", now)) {
              continue;
            }
            job.finishedAt = now;
            deadLettered += 1;
          }
          job.terminalReason = "lease_timeout";
          job.errorNote = "Build job lease expired before completion.";
        }
      }

      if (job.status === "retry_scheduled") {
        const nextAttemptMs = parseTimeMs(job.nextAttemptAt) ?? 0;
        if (nextAttemptMs <= nowMs) {
          if (!transitionBuildJobStatus(job, "queued", now)) {
            continue;
          }
          job.nextAttemptAt = undefined;
          touchedProjectIds.add(job.projectId);
        }
      }
    }

    const aggregate = new Map<
      string,
      {
        activeAction?: BuildJobAction;
        hasDeadLetter: boolean;
        deadLetterError?: string;
      }
    >();

    for (const job of store.buildJobs) {
      if (!touchedProjectIds.has(job.projectId)) continue;
      const bucket = aggregate.get(job.projectId) ?? { hasDeadLetter: false };

      if (ACTIVE_JOB_STATUSES.includes(job.status) && job.status !== "retry_scheduled" && !bucket.activeAction) {
        bucket.activeAction = job.action;
      }

      if (job.status === "dead_letter") {
        bucket.hasDeadLetter = true;
        bucket.deadLetterError = bucket.deadLetterError ?? job.errorNote;
      }

      aggregate.set(job.projectId, bucket);
    }

    for (const projectId of touchedProjectIds) {
      const project = store.projects.find((entry) => entry.id === projectId);
      if (!project) continue;

      const bucket = aggregate.get(projectId);
      if (bucket?.activeAction) {
        project.status = "running";
        project.latestPhase = phaseForAction(bucket.activeAction);
      } else if (bucket?.hasDeadLetter) {
        project.status = "failed";
        project.latestPhase = "failed";
        project.lastError = bucket.deadLetterError ?? "Build job moved to dead letter queue after exhausting retries.";
      } else {
        project.status = "idle";
        project.latestPhase = "planning";
      }
      project.updatedAt = now;
    }

    return { recovered, deadLettered };
  });
}

export async function ensureProjectSessionToken(projectId: string): Promise<string | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    if (!project.sessionToken) {
      project.sessionToken = crypto.randomUUID();
      project.updatedAt = nowIso();
    }

    return project.sessionToken;
  });
}

export async function appendProjectArtifact(projectId: string, artifact: BuilderArtifact): Promise<BuilderArtifact | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    project.artifacts.unshift(artifact);
    project.artifacts = project.artifacts.slice(0, 200);
    project.updatedAt = nowIso();
    return artifact;
  });
}

export async function createProjectSnapshot(
  projectId: string,
  snapshot: Omit<ProjectSnapshot, "id" | "projectId" | "createdAt">,
): Promise<ProjectSnapshot | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const next: ProjectSnapshot = {
      ...snapshot,
      id: crypto.randomUUID(),
      projectId,
      createdAt: nowIso(),
    };

    project.snapshots.unshift(next);
    project.snapshots = project.snapshots.slice(0, 100);
    project.updatedAt = nowIso();
    return next;
  });
}

export async function appendBuildHistory(
  projectId: string,
  entry: Omit<BuildHistoryEntry, "id" | "projectId" | "createdAt">,
): Promise<BuildHistoryEntry | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((item) => item.id === projectId);
    if (!project) return null;

    const next: BuildHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      projectId,
      createdAt: nowIso(),
    };

    project.buildHistory.unshift(next);
    project.buildHistory = project.buildHistory.slice(0, 200);
    project.updatedAt = nowIso();
    return next;
  });
}

export async function restoreProjectFromSnapshot(projectId: string, snapshotId: string): Promise<ProjectRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const snapshot = project.snapshots.find((entry) => entry.id === snapshotId);
    if (!snapshot) return null;

    project.initialPrompt = snapshot.prompt;
    project.latestPreviewUrl = snapshot.previewUrl;
    project.latestPhase = snapshot.phase;
    project.status = snapshot.outcome === "failed" ? "failed" : "running";
    project.updatedAt = nowIso();
    return project;
  });
}

export async function createProjectDeployment(input: {
  projectId: string;
  environment: "preview" | "production";
  commitHash: string;
  provider: "vercel" | "cloudflare";
  createdBy: string;
  url?: string;
}): Promise<DeploymentRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === input.projectId);
    if (!project) return null;

    const now = nowIso();
    const deployment: DeploymentRecord = {
      deploymentId: crypto.randomUUID(),
      projectId: input.projectId,
      environment: input.environment,
      commitHash: input.commitHash,
      status: "queued",
      provider: input.provider,
      url: input.url,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    project.deployments.unshift(deployment);
    project.deployments = project.deployments.slice(0, 100);
    project.updatedAt = now;
    return deployment;
  });
}

export async function listProjectDeployments(projectId: string): Promise<DeploymentRecord[] | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  return [...project.deployments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateProjectDeployment(
  projectId: string,
  deploymentId: string,
  patch: Partial<Pick<DeploymentRecord, "status" | "url" | "failureReason" | "rolledBackFromDeploymentId">>,
): Promise<DeploymentRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const deployment = project.deployments.find((entry) => entry.deploymentId === deploymentId);
    if (!deployment) return null;

    if (patch.status !== undefined) deployment.status = patch.status;
    if (patch.url !== undefined) deployment.url = patch.url;
    if (patch.failureReason !== undefined) deployment.failureReason = patch.failureReason;
    if (patch.rolledBackFromDeploymentId !== undefined) {
      deployment.rolledBackFromDeploymentId = patch.rolledBackFromDeploymentId;
    }

    deployment.updatedAt = nowIso();
    project.updatedAt = deployment.updatedAt;
    return deployment;
  });
}

export async function rollbackProjectDeployment(
  projectId: string,
  rollbackToDeploymentId: string,
  createdBy: string,
): Promise<DeploymentRecord | null> {
  return withWriteLock(async (store) => {
    const project = store.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    const target = project.deployments.find((entry) => entry.deploymentId === rollbackToDeploymentId);
    if (!target) return null;

    const now = nowIso();
    const rollback: DeploymentRecord = {
      deploymentId: crypto.randomUUID(),
      projectId,
      environment: target.environment,
      commitHash: target.commitHash,
      status: "rolled_back",
      provider: target.provider,
      url: target.url,
      createdBy,
      createdAt: now,
      updatedAt: now,
      rolledBackFromDeploymentId: rollbackToDeploymentId,
    };

    project.deployments.unshift(rollback);
    project.deployments = project.deployments.slice(0, 100);
    project.updatedAt = now;
    return rollback;
  });
}
