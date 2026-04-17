import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StoreShape = {
  projects: Array<Record<string, unknown>>;
  buildJobs: Array<{
    id: string;
    leaseAt?: string;
    startedAt?: string;
    updatedAt: string;
    status: string;
    terminalReason?: string;
  }>;
};

const originalCwd = process.cwd();
let testDir = "";
let storeApi: Awaited<typeof import("@/lib/project-store")>;

async function readStoreFile(): Promise<StoreShape> {
  const storePath = path.join(process.cwd(), ".samaa", "projects.json");
  const raw = await readFile(storePath, "utf-8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStoreFile(next: StoreShape): Promise<void> {
  const storePath = path.join(process.cwd(), ".samaa", "projects.json");
  await writeFile(storePath, JSON.stringify(next, null, 2), "utf-8");
}

beforeEach(async () => {
  testDir = await mkdtemp(path.join(os.tmpdir(), "samaa-project-store-"));
  process.chdir(testDir);
  process.env.BUILD_JOB_STALE_MS = "50";
  vi.resetModules();
  storeApi = await import("@/lib/project-store");
});

afterEach(async () => {
  delete process.env.BUILD_JOB_STALE_MS;
  process.chdir(originalCwd);
  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe("project-store build jobs", () => {
  it("assigns a new session token when duplicating projects", async () => {
    const project = await storeApi.createProject({
      ownerId: "user-a",
      initialPrompt: "Duplicate me",
      name: "Source",
      runtimeProvider: "openai",
    });

    const duplicate = await storeApi.duplicateProject(project.id);
    expect(duplicate).not.toBeNull();
    expect(duplicate?.sessionToken).toBeTruthy();
    expect(duplicate?.sessionToken).not.toBe(project.sessionToken);
  });

  it("scopes projects by owner and fails closed for ownerless legacy projects", async () => {
    const legacy = await storeApi.createProject({
      initialPrompt: "Legacy prompt",
      name: "Legacy Project",
      runtimeProvider: "openai",
    });

    const owned = await storeApi.createProject({
      ownerId: "user-b",
      initialPrompt: "Owned prompt",
      name: "Owned Project",
      runtimeProvider: "openai",
    });

    const userAProjects = await storeApi.listProjectsForOwner("user-a");
    expect(userAProjects.some((project) => project.id === legacy.id)).toBe(false);
    expect(userAProjects.some((project) => project.id === owned.id)).toBe(false);

    const userBProjects = await storeApi.listProjectsForOwner("user-b");
    expect(userBProjects.some((project) => project.id === owned.id)).toBe(true);

    const legacyForUserA = await storeApi.getProjectByIdForOwner(legacy.id, "user-a");
    expect(legacyForUserA).toBeNull();

    const legacyForUserB = await storeApi.getProjectByIdForOwner(legacy.id, "user-b");
    expect(legacyForUserB).toBeNull();
  });

  it("defers stale running job recovery until sweeper execution", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Build a todo app",
      name: "Todo",
      runtimeProvider: "openai",
    });

    const first = await storeApi.enqueueBuildJob({
      projectId: project.id,
      action: "generate",
      message: "Generate app",
    });
    expect(first).not.toBeNull();

    const claimed = await storeApi.claimQueuedBuildJob(project.id, first!.job.id);
    expect(claimed?.status).toBe("running");

    const staleIso = new Date(Date.now() - 60_000).toISOString();
    const store = await readStoreFile();
    store.buildJobs = store.buildJobs.map((job) =>
      job.id === first!.job.id
        ? { ...job, leaseAt: staleIso, startedAt: staleIso, updatedAt: staleIso }
        : job,
    );
    await writeStoreFile(store);

    const next = await storeApi.enqueueBuildJob({
      projectId: project.id,
      action: "retry-build",
      message: "Retry build",
    });

    expect(next).not.toBeNull();
    expect(next!.created).toBe(false);
    expect(next!.job.id).toBe(first!.job.id);

    const jobs = await storeApi.listBuildJobsForProject(project.id);
    const stale = jobs.find((job) => job.id === first!.job.id);
    expect(stale).toBeDefined();
    expect(stale?.status).toBe("running");
    expect(stale?.retryCount ?? 0).toBe(0);
  });

  it("only claims queued jobs once", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Build a weather app",
      name: "Weather",
      runtimeProvider: "openai",
    });

    const enqueued = await storeApi.enqueueBuildJob({
      projectId: project.id,
      action: "generate",
      message: "Generate weather app",
    });
    expect(enqueued).not.toBeNull();

    const firstClaim = await storeApi.claimQueuedBuildJob(project.id, enqueued!.job.id);
    expect(firstClaim?.status).toBe("running");

    const secondClaim = await storeApi.claimQueuedBuildJob(project.id, enqueued!.job.id);
    expect(secondClaim).toBeNull();
  });

  it("applies deterministic project status on completion", async () => {
    const successProject = await storeApi.createProject({
      initialPrompt: "Build notes app",
      name: "Notes",
      runtimeProvider: "openai",
    });

    const successJob = await storeApi.enqueueBuildJob({
      projectId: successProject.id,
      action: "generate",
      message: "Generate notes app",
    });
    expect(successJob).not.toBeNull();

    await storeApi.claimQueuedBuildJob(successProject.id, successJob!.job.id);
    await storeApi.completeBuildJob(successJob!.job.id, {
      status: "succeeded",
      terminalReason: "build_completed",
      latestPreviewUrl: "https://preview.example/success",
    });

    const completedProject = await storeApi.getProjectById(successProject.id);
    expect(completedProject?.status).toBe("complete");
    expect(completedProject?.latestPhase).toBe("complete");
    expect(completedProject?.latestPreviewUrl).toBe("https://preview.example/success");
    expect(completedProject?.lastError).toBeUndefined();

    const failedProject = await storeApi.createProject({
      initialPrompt: "Build chat app",
      name: "Chat",
      runtimeProvider: "openai",
    });

    const failedJob = await storeApi.enqueueBuildJob({
      projectId: failedProject.id,
      action: "generate",
      message: "Generate chat app",
    });
    expect(failedJob).not.toBeNull();

    await storeApi.claimQueuedBuildJob(failedProject.id, failedJob!.job.id);
    await storeApi.completeBuildJob(failedJob!.job.id, {
      status: "failed",
      terminalReason: "orchestration_failed",
      errorNote: "Build failed in test",
    });

    const failedProjectState = await storeApi.getProjectById(failedProject.id);
    expect(failedProjectState?.status).toBe("failed");
    expect(failedProjectState?.latestPhase).toBe("failed");
    expect(failedProjectState?.lastError).toBe("Build failed in test");
  });

  it("rejects invalid status transitions from dead_letter", async () => {
    process.env.BUILD_JOB_MAX_RETRIES = "0";

    const project = await storeApi.createProject({
      initialPrompt: "Build strict FSM app",
      name: "Strict FSM",
      runtimeProvider: "openai",
    });

    const enqueued = await storeApi.enqueueBuildJob({
      projectId: project.id,
      action: "generate",
      message: "Generate app",
    });
    expect(enqueued).not.toBeNull();

    await storeApi.claimQueuedBuildJob(project.id, enqueued!.job.id);
    const deadLetter = await storeApi.scheduleBuildJobRetry(enqueued!.job.id, "forced retry exhaustion");
    expect(deadLetter?.status).toBe("dead_letter");

    const invalidCompletion = await storeApi.completeBuildJob(enqueued!.job.id, {
      status: "succeeded",
      terminalReason: "should_not_apply",
    });

    expect(invalidCompletion).toBeNull();
    const stored = await storeApi.getBuildJobById(enqueued!.job.id);
    expect(stored?.status).toBe("dead_letter");
  });
});

describe("project-store walkthrough invariants", () => {
  function buildDiscoveryFixture() {
    const screen = {
      id: "screen-home",
      name: "Home",
      purpose: "Show dashboard",
      assumption: "Users need quick overview",
      problemSolved: "Centralized status",
      features: [
        {
          id: "feature-summary",
          name: "Summary card",
          description: "Shows KPI",
          logic: "Render static summary",
          edgeCases: [],
        },
      ],
      userFlow: "Open app and view summary",
      edgeCases: [],
      dataFlow: "Read-only",
      navigatesTo: [],
      validatedByUser: false,
    };

    return {
      screenHypotheses: [screen],
      requirementsDoc: {
        rawIntent: "Build a dashboard app",
        intentAnalysis: {
          coreProblems: ["Need summary"],
          targetUsers: ["Team members"],
          domainKeywords: ["dashboard"],
          hypotheses: ["Summary-first UX"],
          suggestedSearchQueries: ["dashboard best practices"],
        },
        domainInsights: [],
        screens: [screen],
        globalEdgeCases: [],
        userFlowSummary: "Single-screen flow",
        dataModel: "No persistence",
        validation: {
          walkthroughCompleted: false,
          researchAvailable: true,
          researchDegraded: false,
        },
      },
      wireframeHtml: "<div>wireframe</div>",
      clarificationQuestions: {},
    };
  }

  it("does not seal requirements when a screen is rejected", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Build app",
      name: "Walkthrough",
      runtimeProvider: "openai",
    });

    await storeApi.saveDiscoveryResults(project.id, {
      ...buildDiscoveryFixture(),
      phase: "walkthrough",
    });

    const result = await storeApi.applyWalkthroughFeedback(project.id, {
      screenId: "screen-home",
      action: "reject",
      feedback: "Needs major changes",
    });

    expect(result).not.toBeNull();
    expect(result?.isComplete).toBe(false);

    const updated = await storeApi.getProjectById(project.id);
    expect(updated?.latestPhase).toBe("walkthrough");
    expect(updated?.requirementsDoc?.validation?.walkthroughCompleted).toBe(false);
    expect(updated?.requirementsDoc?.validation?.sealedAt).toBeUndefined();
  });

  it("blocks walkthrough mutations after requirements are sealed", async () => {
    const project = await storeApi.createProject({
      initialPrompt: "Build app",
      name: "Sealed walkthrough",
      runtimeProvider: "openai",
    });

    await storeApi.saveDiscoveryResults(project.id, {
      ...buildDiscoveryFixture(),
      phase: "walkthrough",
    });

    const accepted = await storeApi.applyWalkthroughFeedback(project.id, {
      screenId: "screen-home",
      action: "accept",
    });
    expect(accepted?.isComplete).toBe(true);

    const mutationAfterSeal = await storeApi.applyWalkthroughFeedback(project.id, {
      screenId: "screen-home",
      action: "modify",
      feedback: "Change after seal",
    });
    expect(mutationAfterSeal).toBeNull();
  });
});
