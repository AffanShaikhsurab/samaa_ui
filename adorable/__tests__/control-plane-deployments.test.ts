import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
let testDir = "";
let storeApi: Awaited<typeof import("@/lib/project-store")>;
let controlPlaneApi: Awaited<typeof import("@/lib/control-plane")>;

beforeEach(async () => {
  testDir = await mkdtemp(path.join(os.tmpdir(), "samaa-control-plane-"));
  process.chdir(testDir);
  process.env.BUILD_GLOBAL_QUEUE_DEPTH_CAP = "1";
  process.env.BUILD_PER_PROJECT_ACTIVE_CAP = "2";
  process.env.BUILD_PER_PROVIDER_CONCURRENCY_CAP = "5";
  process.env.BUILD_JOB_MAX_RETRIES = "0";
  vi.resetModules();
  storeApi = await import("@/lib/project-store");
  controlPlaneApi = await import("@/lib/control-plane");
});

afterEach(async () => {
  delete process.env.BUILD_GLOBAL_QUEUE_DEPTH_CAP;
  delete process.env.BUILD_PER_PROJECT_ACTIVE_CAP;
  delete process.env.BUILD_PER_PROVIDER_CONCURRENCY_CAP;
  delete process.env.BUILD_JOB_MAX_RETRIES;
  process.chdir(originalCwd);
  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe("control-plane admission and retry semantics", () => {
  it("enforces global queue cap with retry-after semantics", async () => {
    const projectA = await storeApi.createProject({ initialPrompt: "A", name: "A", runtimeProvider: "openai" });
    const projectB = await storeApi.createProject({ initialPrompt: "B", name: "B", runtimeProvider: "openai" });

    const first = await controlPlaneApi.enqueueProjectAction({
      projectId: projectA.id,
      action: "generate",
      message: "build A",
      idempotencyKey: "k1",
    });
    expect(first.accepted).toBe(true);

    const second = await controlPlaneApi.enqueueProjectAction({
      projectId: projectB.id,
      action: "generate",
      message: "build B",
      idempotencyKey: "k2",
    });

    expect(second.accepted).toBe(false);
    if (!second.accepted) {
      expect(second.reason).toBe("global_queue_cap");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("moves failed running jobs to dead letter once retry budget is exhausted", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Test retry budget",
      name: "Retry",
      runtimeProvider: "openai",
    });

    const enqueued = await controlPlaneApi.enqueueProjectAction({
      projectId: project.id,
      action: "generate",
      message: "Run build",
      idempotencyKey: "retry-job",
    });

    expect(enqueued.accepted).toBe(true);
    if (!enqueued.accepted) return;

    const claimed = await controlPlaneApi.claimProjectJob(project.id, enqueued.job.id, "worker:test");
    expect(claimed?.status).toBe("running");

    const retried = await controlPlaneApi.scheduleRetriableFailure(enqueued.job.id, "forced failure");
    expect(retried?.status).toBe("dead_letter");
  });
});

describe("deployment persistence", () => {
  it("creates deployments and supports rollback records", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Ship app",
      name: "Deploy",
      runtimeProvider: "openai",
    });

    const deployment = await storeApi.createProjectDeployment({
      projectId: project.id,
      environment: "preview",
      commitHash: "abc123",
      provider: "vercel",
      createdBy: "tester",
      url: "https://preview.example/app",
    });

    expect(deployment).not.toBeNull();
    if (!deployment) return;

    await storeApi.updateProjectDeployment(project.id, deployment.deploymentId, { status: "succeeded" });

    const deployments = await storeApi.listProjectDeployments(project.id);
    expect(deployments?.length).toBeGreaterThan(0);

    const rollback = await storeApi.rollbackProjectDeployment(project.id, deployment.deploymentId, "tester");
    expect(rollback?.status).toBe("rolled_back");
    expect(rollback?.rolledBackFromDeploymentId).toBe(deployment.deploymentId);
  });
});
