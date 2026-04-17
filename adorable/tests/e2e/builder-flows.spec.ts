import { expect, test } from "@playwright/test";

function extractSsePayloads(sse: string): Array<Record<string, unknown>> {
  return sse
    .split("\n\n")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n"),
    )
    .filter(Boolean)
    .map((json) => JSON.parse(json) as Record<string, unknown>);
}

test("builder lifecycle: create, resume, orchestrate, retry/repair, snapshot/restore", async ({ request }) => {
  const createSession = await request.post("/api/builder/sessions", {
    data: {
      name: "E2E lifecycle project",
      prompt: "Build a clean task manager app with a summary card.",
      runtimeProvider: "openai",
    },
  });
  expect(createSession.ok()).toBeTruthy();

  const createdPayload = (await createSession.json()) as {
    session: { id: string; phase: string; sessionToken?: string };
  };
  const projectId = createdPayload.session.id;
  expect(projectId).toBeTruthy();
  expect(createdPayload.session.sessionToken).toBeTruthy();
  const sessionToken = createdPayload.session.sessionToken as string;

  const messageResponse = await request.post(`/api/builder/sessions/${projectId}/messages`, {
    headers: { "x-builder-session-token": sessionToken },
    data: { message: "Use a modern card layout and responsive spacing." },
  });
  expect(messageResponse.ok()).toBeTruthy();
  expect(messageResponse.headers()["content-type"]).toContain("text/event-stream");

  const sseBody = await messageResponse.text();
  const events = extractSsePayloads(sseBody);

  const eventTypes = events
    .map((event) => event.type)
    .filter((value): value is string => typeof value === "string");

  expect(eventTypes).toContain("phase");
  expect(eventTypes).toContain("preview_url");
  expect(eventTypes).toContain("completed");

  const completedEvent = events.find((event) => event.type === "completed") as
    | { session?: { id?: string; phase?: string; previewUrl?: string } }
    | undefined;
  expect(completedEvent?.session?.id).toBe(projectId);
  expect(completedEvent?.session?.phase).toBe("complete");
  expect(completedEvent?.session?.previewUrl).toContain(projectId);

  const artifactsResponse = await request.get(`/api/builder/sessions/${projectId}/artifacts`);
  expect(artifactsResponse.ok()).toBeTruthy();
  const artifactsPayload = (await artifactsResponse.json()) as {
    artifacts: Array<{ kind: string }>;
    snapshots: Array<{ id: string; outcome: string }>;
    buildHistory: Array<{ action: string }>;
  };

  expect(artifactsPayload.artifacts.some((artifact) => artifact.kind === "preview")).toBeTruthy();
  expect(artifactsPayload.snapshots.length).toBeGreaterThan(0);
  expect(artifactsPayload.buildHistory.some((entry) => entry.action === "generate")).toBeTruthy();

  const retryResponse = await request.post(`/api/projects/${projectId}/retry-build`, {
    headers: { "x-builder-session-token": sessionToken },
  });
  expect(retryResponse.ok()).toBeTruthy();
  const retryPayload = (await retryResponse.json()) as {
    projectId: string;
    jobId: string;
    jobStatus: string;
    created: boolean;
    suggestedMessage?: string;
  };
  expect(retryPayload.projectId).toBe(projectId);
  expect(retryPayload.jobId).toBeTruthy();
  expect(["queued", "running"]).toContain(retryPayload.jobStatus);
  expect(retryPayload.suggestedMessage).toContain("Retry the previous Flutter build");

  const repairResponse = await request.post(`/api/projects/${projectId}/repair`, {
    headers: { "x-builder-session-token": sessionToken },
  });
  expect(repairResponse.ok()).toBeTruthy();
  const repairPayload = (await repairResponse.json()) as {
    projectId: string;
    jobId: string;
    jobStatus: string;
    created: boolean;
    suggestedMessage?: string;
  };
  expect(repairPayload.projectId).toBe(projectId);
  expect(repairPayload.jobId).toBeTruthy();
  expect(["queued", "running"]).toContain(repairPayload.jobStatus);
  expect(repairPayload.suggestedMessage).toContain("Repair the current Flutter project");

  const createSnapshot = await request.post(`/api/projects/${projectId}/snapshots`, {
    data: {
      phase: "verifying",
      outcome: "partial",
      prompt: "Manual snapshot from e2e",
    },
  });
  expect(createSnapshot.status()).toBe(201);
  const snapshotPayload = (await createSnapshot.json()) as {
    snapshot: { id: string; phase: string; outcome: string };
  };
  expect(snapshotPayload.snapshot.phase).toBe("verifying");

  const restoreResponse = await request.post(
    `/api/projects/${projectId}/snapshots/${snapshotPayload.snapshot.id}/restore`,
  );
  expect(restoreResponse.ok()).toBeTruthy();

  const restoredPayload = (await restoreResponse.json()) as {
    project: { id: string; latestPhase: string };
  };
  expect(restoredPayload.project.id).toBe(projectId);
  expect(restoredPayload.project.latestPhase).toBe("verifying");

  const projectState = await request.get(`/api/projects/${projectId}`);
  expect(projectState.ok()).toBeTruthy();
  const projectStatePayload = (await projectState.json()) as {
    project: { buildHistory: Array<{ action: string }> };
  };
  expect(projectStatePayload.project.buildHistory.some((entry) => entry.action === "restore")).toBeTruthy();

  const deployStart = await request.post(`/api/projects/${projectId}/deploy`, {
    headers: { "x-builder-session-token": sessionToken },
    data: { action: "deploy", environment: "preview", provider: "vercel" },
  });
  expect(deployStart.ok()).toBeTruthy();
  const deployPayload = (await deployStart.json()) as {
    deployment?: { deploymentId?: string; status?: string };
  };
  expect(deployPayload.deployment?.deploymentId).toBeTruthy();

  const deploymentList = await request.get(`/api/projects/${projectId}/deployments`, {
    headers: { "x-builder-session-token": sessionToken },
  });
  expect(deploymentList.ok()).toBeTruthy();
  const deploymentListPayload = (await deploymentList.json()) as {
    deployments: Array<{ deploymentId: string; status: string }>;
  };
  expect(deploymentListPayload.deployments.length).toBeGreaterThan(0);

  const rollback = await request.post(`/api/projects/${projectId}/deploy`, {
    headers: { "x-builder-session-token": sessionToken },
    data: {
      action: "rollback",
      rollbackToDeploymentId: deploymentListPayload.deployments[0].deploymentId,
    },
  });
  expect(rollback.ok()).toBeTruthy();
});
