import Sandbox from "e2b";

export interface E2BToolResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export const E2B_WORKDIR = "/home/user";

export const createE2BSandbox = async (
  apiKey?: string,
  template?: string,
  timeoutMs: number = 300_000
): Promise<Sandbox> => {
  const sandbox = await Sandbox.create(template ?? "base", {
    timeoutMs,
    metadata: { createdAt: new Date().toISOString() },
  });
  return sandbox;
};

export const executeCommandInE2B = async (
  sandbox: Sandbox,
  command: string,
  cwd?: string,
  timeoutMs: number = 60_000
): Promise<E2BToolResult> => {
  try {
    const result = await sandbox.commands.run(command, {
      cwd,
      timeoutMs,
    });

    return {
      ok: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? -1,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      error: "CommandExecutionError",
    };
  }
};

export const executeBackgroundCommandInE2B = async (
  sandbox: Sandbox,
  command: string,
  cwd?: string
): Promise<{ handle: Awaited<ReturnType<typeof sandbox.commands.run>> }> => {
  const handle = await sandbox.commands.run(command, {
    cwd,
    background: true,
  });
  return { handle };
};

export const uploadFilesToE2B = async (
  sandbox: Sandbox,
  files: Array<{ source: Buffer | string; destination: string }>
): Promise<void> => {
  for (const file of files) {
    const content = typeof file.source === "string" ? file.source : file.source.toString();
    await sandbox.files.write(file.destination, content);
  }
};

export const downloadFileFromE2B = async (
  sandbox: Sandbox,
  path: string
): Promise<Buffer | null> => {
  try {
    const content = await sandbox.files.read(path);
    return Buffer.from(content);
  } catch {
    return null;
  }
};

export const deleteE2BSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.kill();
};

export const listFilesE2B = async (
  sandbox: Sandbox,
  path: string
): Promise<Array<{ name: string; type: string }>> => {
  const entries = await sandbox.files.list(path);
  return entries.map((e) => ({ name: e.name, type: e.type ?? "unknown" }));
};

export const getE2BPreviewUrl = (
  sandbox: Sandbox,
  port: number = 3000
): { url: string; hostname: string } | null => {
  try {
    const hostname = sandbox.getHost(port);
    return {
      url: `https://${hostname}`,
      hostname,
    };
  } catch {
    return null;
  }
};

export const getTrafficAccessToken = (sandbox: Sandbox): string | undefined => {
  try {
    return sandbox.trafficAccessToken ?? undefined;
  } catch {
    return undefined;
  }
};
