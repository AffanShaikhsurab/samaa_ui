import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      BUILDER_ORCHESTRATION_MODE: "mock",
      CONTROL_PLANE_V2: "true",
      DEPLOYMENT_V1: "true",
    },
  },
});
