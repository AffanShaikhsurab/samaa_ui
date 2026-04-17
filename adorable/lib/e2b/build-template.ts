import { config } from "dotenv";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Sandbox, Template, defaultBuildLogger } from "e2b";
import { flutterE2BTemplate, TEMPLATE_NAME } from "./template";

config({ path: ".env.local" });
const execFileAsync = promisify(execFile);
const BUILD_CONTEXT_QUICKAPP_DIR = path.resolve(process.cwd(), "lib/e2b/quickapp-vendor");
const TEMP_CLONE_QUICKAPP_DIR = path.resolve(process.cwd(), ".e2b-build/quickapp-source");
const DEFAULT_LOCAL_QUICKAPP_DIR = path.resolve(process.cwd(), "../../connectit/quickapp");
const QUICKAPP_STAGE_ENTRIES = [
  "bin",
  "lib",
  "pubspec.yaml",
  "pubspec.lock",
  "analysis_options.yaml",
  ".pubignore",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
] as const;

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function withToken(urlValue: string, token?: string): string {
  if (!token) return urlValue;
  const url = new URL(urlValue);
  url.username = "x-access-token";
  url.password = token;
  return url.toString();
}

async function stageQuickappSource() {
  await rm(BUILD_CONTEXT_QUICKAPP_DIR, { recursive: true, force: true });
  await rm(TEMP_CLONE_QUICKAPP_DIR, { recursive: true, force: true });
  await mkdir(BUILD_CONTEXT_QUICKAPP_DIR, { recursive: true });

  async function copyStageEntries(sourceDir: string) {
    for (const entry of QUICKAPP_STAGE_ENTRIES) {
      const sourcePath = path.join(sourceDir, entry);
      if (!(await pathExists(sourcePath))) {
        continue;
      }

      await cp(sourcePath, path.join(BUILD_CONTEXT_QUICKAPP_DIR, entry), { recursive: true });
    }
  }

  const localSource = process.env.QUICKAPP_LOCAL_PATH
    ? path.resolve(process.cwd(), process.env.QUICKAPP_LOCAL_PATH)
    : DEFAULT_LOCAL_QUICKAPP_DIR;

  if (await pathExists(localSource)) {
    await copyStageEntries(localSource);
    console.log(`Using local QuickApp source: ${localSource}`);
    return;
  }

  const gitUrl = process.env.QUICKAPP_GIT_URL;
  if (!gitUrl) {
    throw new Error(
      "QuickApp source is required. Set QUICKAPP_LOCAL_PATH or QUICKAPP_GIT_URL so the compiler can be staged into the E2B build context.",
    );
  }

  const authenticatedUrl = withToken(gitUrl, process.env.QUICKAPP_GIT_TOKEN);
  await mkdir(path.dirname(TEMP_CLONE_QUICKAPP_DIR), { recursive: true });
  await execFileAsync("git", ["clone", "--depth", "1", authenticatedUrl, TEMP_CLONE_QUICKAPP_DIR], {
    cwd: process.cwd(),
  });
  await copyStageEntries(TEMP_CLONE_QUICKAPP_DIR);
  console.log(`Cloned QuickApp source from ${gitUrl}`);
}

async function buildTemplate() {
  const cpuCount = 8;
  const memoryMB = 8192;
  await stageQuickappSource();
  console.log(`Building E2B Flutter template: ${TEMPLATE_NAME}...`);
  console.log(`Machine specs: ${cpuCount} CPUs, ${memoryMB} MB RAM`);
  console.log("Using Build System 2.0 - build runs on E2B infrastructure");
  console.log("");

  try {
    const buildInfo = await Template.build(
      flutterE2BTemplate,
      TEMPLATE_NAME,
      {
        onBuildLogs: defaultBuildLogger({ minLevel: "info" }),
        cpuCount,
        memoryMB,
      }
    );

    console.log("");
    console.log("✅ Template build completed!");
    console.log("Template name:", TEMPLATE_NAME);
    console.log("Machine specs:", `${cpuCount} CPUs, ${memoryMB} MB RAM`);
    console.log("Build info:", JSON.stringify(buildInfo, null, 2));

    return buildInfo;
  } catch (error) {
    console.error("❌ Template build failed:", error);
    throw error;
  }
}

async function verifyTemplate() {
  console.log("");
  console.log("Verifying template runtime...");

  const sandbox = await Sandbox.create(TEMPLATE_NAME, { timeoutMs: 120_000 });
  try {
    const verification = await sandbox.commands.run(
      `bash -lc 'export PATH=/home/user/flutter/bin:/home/user/.pub-cache/bin:$PATH && mkdir -p /home/user/template-verify && cat > /home/user/template-verify/app.ancl <<'"'"'EOF'"'"'
#n:Verify,c:blue
S(main)A(Verify)B[
  T(Ready){s:20,b}
]
EOF
flutter --version && dart --version && quickapp --version && quickapp build /home/user/template-verify/app.ancl -o /home/user/template-verify/output && test -f /home/user/template-verify/output/pubspec.yaml'`,
      { cwd: "/home/user", timeoutMs: 180_000 },
    );

    if (verification.exitCode !== 0) {
      throw new Error(verification.stderr || verification.stdout || "Template verification failed.");
    }

    console.log("✅ Runtime tools verified.");
  } finally {
    await sandbox.kill().catch(() => undefined);
  }
}

buildTemplate()
  .then(async () => {
    await verifyTemplate();
    console.log("");
    console.log("You can now use this template with:");
    console.log(`  Sandbox.create('${TEMPLATE_NAME}')`);
  })
  .catch((error) => {
    console.error("");
    console.error("Build failed.");
    process.exit(1);
  });
