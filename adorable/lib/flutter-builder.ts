import { Sandbox } from "e2b";
import { log } from "./log";
import { getE2BPreviewUrl } from "./e2b-provider";

export const FLUTTER_WORKDIR = "/home/user";
export const TEMPLATE_NAME = "flutter-web-base-v1";

const MAX_SANDBOX_TIMEOUT_MS = 600_000;

export type E2BFlutterVm = Sandbox & {
  __vmId?: string;
};

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

export { shellQuote };

const flutterEnvPrefix = `export PATH="/home/user/flutter/bin:$PATH" && export FLUTTER_ROOT="/home/user/flutter" && `;

const exec = async (
  sandbox: E2BFlutterVm,
  command: string,
  cwd: string = FLUTTER_WORKDIR,
  timeoutMs: number = 120_000
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null }> => {
  const t0 = Date.now();
  const truncated = command.length > 100 ? command.slice(0, 100) + "…" : command;
  log.sandbox(`exec → ${truncated}`, { cwd, timeoutMs });
  const result = await sandbox.commands.run(command, { cwd, timeoutMs });
  const elapsed = Date.now() - t0;
  const ok = result.exitCode === 0;
  log.sandbox(ok ? `✓ (${elapsed}ms)` : `✗ exit=${result.exitCode} (${elapsed}ms)`, {
    stdoutLen: result.stdout.length,
    stderrLen: result.stderr.length,
  });
  return {
    ok,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? null,
  };
};

export async function createFlutterSandbox(): Promise<E2BFlutterVm> {
  const t0 = Date.now();
  log.sandbox("createFlutterSandbox() — creating E2B sandbox", {
    template: TEMPLATE_NAME,
    timeout: MAX_SANDBOX_TIMEOUT_MS,
  });

  const sandbox = await Sandbox.create(TEMPLATE_NAME, {
    timeoutMs: MAX_SANDBOX_TIMEOUT_MS,
  }) as E2BFlutterVm;

  sandbox.__vmId = sandbox.sandboxId;

  log.sandbox(`E2B sandbox ready (${Date.now() - t0}ms)`, {
    vmId: sandbox.__vmId,
  });

  return sandbox;
}

export async function initFlutterProject(
  vm: E2BFlutterVm,
  options: { projectName: string; codeFiles: { path: string; content: string }[] }
): Promise<{ ok: boolean; error?: string }> {
  const { projectName, codeFiles } = options;
  const projectPath = `${FLUTTER_WORKDIR}/${projectName}`;

  log.sandbox(`initFlutterProject: ${projectName}`, { codeFiles: codeFiles.length });

  log.sandbox(`running 'flutter create' for ${projectName}…`);
  const createResult = await exec(
    vm,
    `${flutterEnvPrefix}flutter create --org com.samaa --platforms web ${shellQuote(projectName)}`,
    FLUTTER_WORKDIR,
    300_000
  );

  if (!createResult.ok) {
    log.sandboxError(`flutter create failed for ${projectName}`, {
      error: createResult.stderr || createResult.stdout,
    });
    return { ok: false, error: createResult.stderr || createResult.stdout };
  }
  log.sandbox(`flutter create ✓ for ${projectName}`);

  if (codeFiles.length > 0) {
    log.sandbox(`uploading ${codeFiles.length} code file(s)…`);
    for (const file of codeFiles) {
      const fullPath = `${projectPath}/${file.path}`;
      const parentDir = fullPath.split("/").slice(0, -1).join("/");
      try {
        const mkdirResult = await exec(vm, `mkdir -p ${shellQuote(parentDir)}`, FLUTTER_WORKDIR, 30000);
        if (!mkdirResult.ok) {
          log.sandboxWarn(`mkdir failed for ${parentDir}, trying alternative method`);
        }
        await vm.files.write(fullPath, file.content);
      } catch (e) {
        log.sandboxError(`failed to write ${fullPath}`, {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    log.sandbox(`code files uploaded`);
  }

  log.sandbox(`running 'flutter pub get'…`);
  const pubResult = await exec(
    vm,
    `${flutterEnvPrefix}flutter pub get`,
    projectPath,
    180_000
  );

  if (!pubResult.ok) {
    log.sandboxError(`flutter pub get failed`, {
      error: pubResult.stderr || pubResult.stdout,
    });
    return { ok: false, error: pubResult.stderr || pubResult.stdout };
  }
  log.sandbox(`flutter pub get ✓`);

  return { ok: true };
}

export async function buildFlutterWeb(
  vm: E2BFlutterVm,
  projectName: string
): Promise<{ success: boolean; buildLogs?: string; error?: string }> {
  const projectPath = `${FLUTTER_WORKDIR}/${projectName}`;
  log.sandbox(`building Flutter web for ${projectName}…`);
  const t0 = Date.now();

  const result = await exec(
    vm,
    `${flutterEnvPrefix}flutter build web --release`,
    projectPath,
    900_000
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (result.ok) {
    log.sandbox(`Flutter web build ✓ (${elapsed}s)`, {
      projectName,
      stdoutLen: result.stdout.length,
    });
    return { success: true, buildLogs: result.stdout };
  } else {
    log.sandboxError(`Flutter web build ✗ (${elapsed}s)`, {
      projectName,
      stderr: (result.stderr || result.stdout).slice(0, 1000),
    });
    return { success: false, error: result.stderr || result.stdout };
  }
}

export async function serveFlutterWeb(
  vm: E2BFlutterVm,
  projectName: string,
  port = 3000
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const buildDir = `${FLUTTER_WORKDIR}/${projectName}/build/web`;

  log.preview(`getting preview URL for ${buildDir}`);

  try {
    const indexPath = `${buildDir}/index.html`;
    log.preview(`checking if index.html exists at ${indexPath}`);

    const indexContent = await vm.files.read(indexPath);
    log.preview(`index.html found, size: ${indexContent.length} bytes`);

    const previewInfo = getE2BPreviewUrl(vm, port);
    if (!previewInfo) {
      log.previewError("failed to get E2B preview URL");
      return { success: false, error: "Failed to get preview URL from E2B sandbox." };
    }

    log.preview(`E2B preview URL: ${previewInfo.url}`);
    log.preview(`Preview URL ready: ${previewInfo.url}`);
    return { success: true, previewUrl: previewInfo.url };
  } catch (e) {
    log.previewError(`serveFlutterWeb failed: ${e instanceof Error ? e.message : String(e)}`);
    return { success: false, error: `Failed to serve: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function getFlutterFilesFromSandbox(
  vm: E2BFlutterVm,
  projectName: string
): Promise<string[]> {
  const buildDir = `${FLUTTER_WORKDIR}/${projectName}/build/web`;
  log.sandbox(`listing build output: ${buildDir}`);
  try {
    const files = await vm.files.list(buildDir);
    const names = files.map((f) => f.name).filter((n) => n !== "." && n !== "..");
    log.sandbox(`build output: ${names.length} files`, { files: names });
    return names;
  } catch (e) {
    log.sandboxWarn(`could not list build output`, {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

export async function cleanupFlutterSandbox(vm: E2BFlutterVm): Promise<void> {
  log.sandbox("cleaning up E2B sandbox…", { vmId: vm.__vmId });
  try {
    await vm.kill();
    log.sandbox("E2B sandbox cleaned up");
  } catch (e) {
    log.sandboxWarn("error killing E2B sandbox", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}