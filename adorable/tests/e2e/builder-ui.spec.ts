import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });

test("browser UI flow: create, retry, repair, snapshot, resume", async ({ page }) => {
  const uniqueTag = Date.now().toString();
  const prompt = `Build a kanban board app ${uniqueTag} with drag-and-drop cards.`;

  await page.goto("/flutter");
  await page.getByTestId("landing-prompt-input").fill(prompt);
  await page.getByTestId("landing-build-button").click();

  await expect(page).toHaveURL(/\/flutter\/workspace\//);
  await expect(page.getByTestId("workspace-running-state")).toBeVisible();
  await expect(page.getByTestId("workspace-artifacts")).toBeVisible();

  const snapshotRequest = page.waitForResponse(
    (response) => response.url().includes("/snapshots") && response.request().method() === "POST" && response.status() === 201,
  );
  await page.getByTestId("workspace-snapshot").click();
  await snapshotRequest;
  await page.reload();
  await expect(page.getByTestId("workspace-artifacts")).toBeVisible();
  const restoreButtons = page.getByTestId("workspace-restore-snapshot");
  if ((await restoreButtons.count()) > 0) {
    await restoreButtons.first().click();
  }

  await page.getByTestId("workspace-retry-build").click();
  await expect(page.getByTestId("workspace-running-state")).toContainText(/building|running/i);

  await page.getByTestId("workspace-repair").click();
  await expect(page.getByTestId("workspace-running-state")).toContainText(/fixing|running/i);

  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-project-card").first()).toBeVisible();

  const projectCard = page
    .getByTestId("dashboard-project-card")
    .filter({ hasText: uniqueTag })
    .first();

  await expect(projectCard).toBeVisible();
  await projectCard.getByTestId("dashboard-resume").click();

  await expect(page).toHaveURL(/\/flutter\/workspace\//);
  await expect(page.getByTestId("workspace-message-input")).toBeVisible();
});
