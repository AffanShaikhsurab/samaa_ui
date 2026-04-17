import {
  admitAndEnqueueBuildJob,
  BuildJobAction,
  BuildJobRecord,
  type QueueAdmissionResult,
  claimQueuedBuildJob,
  touchBuildJobLease,
  completeBuildJob,
  scheduleBuildJobRetry,
  sweepStaleBuildJobs,
} from "@/lib/project-store";

function resolveCap(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveRetryAfterSeconds(): number {
  const parsed = Number.parseInt(process.env.BUILD_QUEUE_RETRY_AFTER_SECONDS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 15;
  return parsed;
}

export async function enqueueProjectAction(input: {
  projectId: string;
  action: BuildJobAction;
  message: string;
  idempotencyKey: string;
}): Promise<QueueAdmissionResult> {
  const projectActiveCap = resolveCap("BUILD_PER_PROJECT_ACTIVE_CAP", 2);
  const globalQueueCap = resolveCap("BUILD_GLOBAL_QUEUE_DEPTH_CAP", 200);
  const providerConcurrencyCap = resolveCap("BUILD_PER_PROVIDER_CONCURRENCY_CAP", 20);
  const retryAfterSeconds = resolveRetryAfterSeconds();

  return admitAndEnqueueBuildJob({
    projectId: input.projectId,
    action: input.action,
    message: input.message,
    idempotencyKey: input.idempotencyKey,
    projectActiveCap,
    globalQueueCap,
    providerConcurrencyCap,
    retryAfterSeconds,
  });
}

export async function claimProjectJob(projectId: string, jobId: string, leaseOwnerId: string): Promise<BuildJobRecord | null> {
  return claimQueuedBuildJob(projectId, jobId, leaseOwnerId);
}

export async function heartbeatJobLease(jobId: string): Promise<BuildJobRecord | null> {
  return touchBuildJobLease(jobId);
}

export async function markJobComplete(
  jobId: string,
  patch: {
    status: "succeeded" | "failed" | "canceled" | "dead_letter";
    terminalReason?: string;
    errorNote?: string;
    latestPreviewUrl?: string;
  },
): Promise<BuildJobRecord | null> {
  return completeBuildJob(jobId, patch);
}

export async function scheduleRetriableFailure(jobId: string, errorNote: string): Promise<BuildJobRecord | null> {
  return scheduleBuildJobRetry(jobId, errorNote);
}

export async function runControlPlaneSweeper(): Promise<{ recovered: number; deadLettered: number }> {
  return sweepStaleBuildJobs();
}
