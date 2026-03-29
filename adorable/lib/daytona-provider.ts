import {
  Daytona,
  DaytonaError,
  DaytonaNotFoundError,
  DaytonaRateLimitError,
  DaytonaTimeoutError,
  type Sandbox,
  type CreateSandboxBaseParams,
  Image,
} from "@daytonaio/sdk";
import { DaytonaToolResult, type DaytonaSandboxMetadata } from "./daytona-types";

const DAYTONA_TIMEOUT = 60;

export const createDaytonaClient = (apiKey?: string) => {
  return new Daytona({
    apiKey: apiKey ?? process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api",
    target: process.env.DAYTONA_TARGET,
  });
};

export const DAYTONA_DEFAULT_LANGUAGE = "typescript";

export const createDaytonaSandbox = async (
  apiKey?: string,
  params?: Partial<CreateSandboxBaseParams & { onLogs?: (log: string) => void }>
): Promise<Sandbox> => {
  const daytona = createDaytonaClient(apiKey);

  const sandboxParams: CreateSandboxBaseParams = {
    language: DAYTONA_DEFAULT_LANGUAGE,
    autoStopInterval: 30,
    autoArchiveInterval: 1440,
    autoDeleteInterval: -1,
    ...params,
  } as CreateSandboxBaseParams;

  const createOptions = params?.onLogs
    ? { onSnapshotCreateLogs: params.onLogs }
    : undefined;

  return daytona.create(sandboxParams, {
    timeout: DAYTONA_TIMEOUT,
    ...createOptions,
  });
};

export const executeCommandInDaytona = async (
  sandbox: Sandbox,
  command: string,
  cwd?: string,
  env?: Record<string, string>,
  timeout?: number
): Promise<DaytonaToolResult> => {
  try {
    const response = await sandbox.process.executeCommand(
      command,
      cwd,
      env,
      timeout
    );

    return {
      ok: response.exitCode === 0,
      stdout: response.result ?? "",
      stderr: "",
      exitCode: response.exitCode ?? -1,
    };
  } catch (error) {
    if (error instanceof DaytonaTimeoutError) {
      return {
        ok: false,
        stdout: "",
        stderr: `Command timed out after ${timeout ?? "default"} seconds`,
        exitCode: -1,
        error: "TimeoutError",
      };
    }
    if (error instanceof DaytonaRateLimitError) {
      return {
        ok: false,
        stdout: "",
        stderr: "Rate limit exceeded",
        exitCode: -1,
        error: "RateLimitError",
      };
    }
    if (error instanceof DaytonaError) {
      return {
        ok: false,
        stdout: "",
        stderr: error.message,
        exitCode: -1,
        error: error.name,
      };
    }
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      error: "UnknownError",
    };
  }
};

interface CodeRunResult {
  result?: string;
  exitCode?: number;
}

interface ExecuteCommandResult {
  result?: string;
  exitCode?: number;
}

export const runCodeInDaytona = async (
  sandbox: Sandbox,
  code: string,
  language?: string,
  timeout?: number
): Promise<DaytonaToolResult> => {
  try {
    const response = await sandbox.process.codeRun(code);

    const codeResponse = response as unknown as CodeRunResult;

    if (codeResponse.exitCode !== 0) {
      return {
        ok: false,
        stdout: codeResponse.result ?? "",
        stderr: "",
        exitCode: codeResponse.exitCode ?? -1,
      };
    }

    return {
      ok: true,
      stdout: codeResponse.result ?? "",
      stderr: "",
      exitCode: codeResponse.exitCode ?? 0,
    };
  } catch (error) {
    if (error instanceof DaytonaTimeoutError) {
      return {
        ok: false,
        stdout: "",
        stderr: `Code execution timed out after ${timeout ?? "default"} seconds`,
        exitCode: -1,
        error: "TimeoutError",
      };
    }
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      error: "UnknownError",
    };
  }
};

export const uploadFilesToDaytona = async (
  sandbox: Sandbox,
  files: Array<{ source: Buffer | string; destination: string }>
): Promise<void> => {
  const uploads = files.map((file) => {
    if (typeof file.source === "string") {
      return { source: Buffer.from(file.source), destination: file.destination };
    }
    return { source: file.source, destination: file.destination };
  });
  await sandbox.fs.uploadFiles(uploads as Parameters<typeof sandbox.fs.uploadFiles>[0]);
};

export const downloadFileFromDaytona = async (
  sandbox: Sandbox,
  path: string
): Promise<Buffer | null> => {
  try {
    const result = await sandbox.fs.downloadFile(path);
    return result as Buffer;
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) {
      return null;
    }
    throw error;
  }
};

export const deleteDaytonaSandbox = async (
  sandbox: Sandbox,
  timeout?: number
): Promise<void> => {
  await sandbox.delete(timeout);
};

export const stopDaytonaSandbox = async (
  sandbox: Sandbox,
  timeout?: number
): Promise<void> => {
  await sandbox.stop(timeout);
};

export const startDaytonaSandbox = async (
  sandbox: Sandbox,
  timeout?: number
): Promise<void> => {
  await sandbox.start(timeout);
};

export const getDaytonaSandboxMetadata = async (
  sandbox: Sandbox
): Promise<DaytonaSandboxMetadata> => {
  return {
    id: sandbox.id,
    state: (sandbox as unknown as { state?: string }).state ?? "unknown",
  };
};

export const DAYTONA_IMAGE_PRESETS = {
  debianSlim: (version: "3.9" | "3.10" | "3.11" | "3.12" | "3.13" = "3.12") => Image.debianSlim(version),
  node: (version = "20") => Image.fromDockerfile(`node:${version}-slim`),
  python: (version = "3.12") => Image.fromDockerfile(`python:${version}-slim`),
  go: (version = "1.21") => Image.fromDockerfile(`go:${version}-slim`),
  ruby: (version = "3.2") => Image.fromDockerfile(`ruby:${version}-slim`),
} as const;