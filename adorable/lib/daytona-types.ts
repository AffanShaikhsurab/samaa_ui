export interface DaytonaToolResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export interface DaytonaSandboxMetadata {
  id: string;
  state: string;
  language?: string;
}

export interface CreateDaytonaSandboxOptions {
  language?: string;
  image?: string;
  resources?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
  envVars?: Record<string, string>;
  autoStopInterval?: number;
  autoArchiveInterval?: number;
  autoDeleteInterval?: number;
  onLogs?: (log: string) => void;
}