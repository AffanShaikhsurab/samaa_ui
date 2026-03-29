import { Sandbox } from "e2b";
import { TEMPLATE_NAME, FLUTTER_WORKDIR } from "./template";

export interface BuildRequest {
  appName: string;
  orgId: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface BuildResult {
  success: boolean;
  sandboxId: string;
  previewUrl?: string;
  hostname?: string;
  error?: string;
  logs: string[];
}

export interface SandboxSession {
  sandbox: Sandbox;
  logs: string[];
}

const MAX_SANDBOX_TIMEOUT_MS = 600_000;

export async function createFlutterSandbox(): Promise<SandboxSession> {
  const logs: string[] = [];

  const sandbox = await Sandbox.create(TEMPLATE_NAME, {
    timeoutMs: MAX_SANDBOX_TIMEOUT_MS,
  });

  logs.push(`Sandbox created: ${sandbox.sandboxId}`);

  return { sandbox, logs };
}

export async function writeAppFiles(
  session: SandboxSession,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  const { sandbox, logs } = session;

  for (const file of files) {
    const fullPath = `${FLUTTER_WORKDIR}/${file.path}`;
    await sandbox.files.write(fullPath, file.content);
    logs.push(`Wrote file: ${fullPath}`);
  }
}

export async function runFlutterBuild(
  session: SandboxSession,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  const { sandbox, logs } = session;
  const appDir = `${FLUTTER_WORKDIR}/${appName}`;

  logs.push("Running flutter pub get...");
  const pubGetResult = await sandbox.commands.run(
    `export PATH="/home/user/flutter/bin:$PATH" && export FLUTTER_ROOT="/home/user/flutter" && cd ${appDir} && flutter pub get`,
    { timeoutMs: 180_000 }
  );

  if (pubGetResult.exitCode !== 0) {
    logs.push(`pub get failed: ${pubGetResult.stderr}`);
    return { success: false, error: pubGetResult.stderr };
  }
  logs.push("flutter pub get completed");

  logs.push("Running flutter build web --release...");
  const buildResult = await sandbox.commands.run(
    `export PATH="/home/user/flutter/bin:$PATH" && export FLUTTER_ROOT="/home/user/flutter" && cd ${appDir} && flutter build web --release`,
    { timeoutMs: 600_000 }
  );

  if (buildResult.exitCode !== 0) {
    logs.push(`build failed: ${buildResult.stderr}`);
    return { success: false, error: buildResult.stderr };
  }
  logs.push("flutter build web completed");

  return { success: true };
}

export async function startPreviewServer(
  session: SandboxSession,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  const { sandbox, logs } = session;
  const appDir = `${FLUTTER_WORKDIR}/${appName}`;

  logs.push("Starting preview server on port 3000...");

  await sandbox.commands.run(
    `cd ${appDir} && python3 -m http.server 3000 --directory build/web &`,
    { background: true }
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  logs.push("Preview server started");
  return { success: true };
}

export function getPreviewUrl(session: SandboxSession): string | null {
  const { sandbox } = session;

  try {
    const hostname = sandbox.getHost(3000);
    const url = `https://${hostname}`;
    return url;
  } catch {
    return null;
  }
}

export async function cleanupSandbox(session: SandboxSession): Promise<void> {
  try {
    await session.sandbox.kill();
  } catch {}
}

export async function buildFlutterApp(
  request: BuildRequest
): Promise<BuildResult> {
  const logs: string[] = [];
  let session: SandboxSession | null = null;

  try {
    logs.push(`Building app: ${request.appName}`);

    session = await createFlutterSandbox();
    logs.push(...session.logs);

    await writeAppFiles(session, request.files);

    const flutterResult = await runFlutterBuild(session, request.appName);
    if (!flutterResult.success) {
      await cleanupSandbox(session);
      return {
        success: false,
        sandboxId: session.sandbox.sandboxId,
        error: flutterResult.error,
        logs,
      };
    }

    const serverResult = await startPreviewServer(session, request.appName);
    if (!serverResult.success) {
      await cleanupSandbox(session);
      return {
        success: false,
        sandboxId: session.sandbox.sandboxId,
        error: serverResult.error,
        logs,
      };
    }

    const previewUrl = getPreviewUrl(session);

    if (!previewUrl) {
      await cleanupSandbox(session);
      return {
        success: false,
        sandboxId: session.sandbox.sandboxId,
        error: "Failed to generate preview URL",
        logs,
      };
    }

    return {
      success: true,
      sandboxId: session.sandbox.sandboxId,
      previewUrl,
      hostname: previewUrl.replace("https://", ""),
      logs,
    };
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (session) {
      await cleanupSandbox(session);
    }
    return {
      success: false,
      sandboxId: session?.sandbox.sandboxId ?? "unknown",
      error: error instanceof Error ? error.message : String(error),
      logs,
    };
  }
}
