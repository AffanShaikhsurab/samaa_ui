/**
 * Structured logger for the Flutter builder pipeline.
 *
 * Every log line is prefixed with a tag and timestamp so you can
 * trace the full lifecycle of a request in the terminal:
 *
 *   [Sandbox]  [Freestyle]  [Session]  [LLM]  [Tool]  [Chat]  [Build]
 *
 * Usage:
 *   import { log } from "@/lib/log";
 *   log.sandbox("creating VM from snapshot", { snapshotId });
 *   log.tool("writeFile", "start", { file: "lib/main.dart" });
 */

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

type Tag =
  | "Sandbox"
  | "Freestyle"
  | "Session"
  | "LLM"
  | "Tool"
  | "Chat"
  | "Build"
  | "Preview"
  | "Env"
  | "Request"
  | "Response"
  | "Error"
  | "Middleware"
  | "Cookie"
  | "Header";

const TAG_COLORS: Record<Tag, string> = {
  Sandbox: COLORS.cyan,
  Freestyle: COLORS.blue,
  Session: COLORS.magenta,
  LLM: COLORS.yellow,
  Tool: COLORS.green,
  Chat: COLORS.bold,
  Build: COLORS.red,
  Preview: COLORS.cyan,
  Env: COLORS.gray,
  Request: COLORS.blue,
  Response: COLORS.green,
  Error: COLORS.red,
  Middleware: COLORS.magenta,
  Cookie: COLORS.cyan,
  Header: COLORS.yellow,
};

function ts(): string {
  return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function fmt(tag: Tag, msg: string, data?: unknown): string {
  const color = TAG_COLORS[tag] ?? COLORS.gray;
  const prefix = `${COLORS.gray}${ts()}${COLORS.reset} ${color}[${tag}]${COLORS.reset}`;
  const dataStr =
    data !== undefined
      ? ` ${COLORS.dim}${JSON.stringify(data)}${COLORS.reset}`
      : "";
  return `${prefix} ${msg}${dataStr}`;
}

function emit(tag: Tag, msg: string, data?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(fmt(tag, msg, data));
}

function warn(tag: Tag, msg: string, data?: unknown): void {
  console.warn(fmt(tag, `${COLORS.yellow}${msg}${COLORS.reset}`, data));
}

function error(tag: Tag, msg: string, data?: unknown): void {
  console.error(fmt(tag, `${COLORS.red}${msg}${COLORS.reset}`, data));
}

/**
 * Public logger — call the method matching the subsystem.
 * Every method accepts a message and an optional data object.
 */
export const log = {
  // ── Sandbox lifecycle ──────────────────────────────────────────
  sandbox: (msg: string, data?: unknown) => emit("Sandbox", msg, data),
  sandboxWarn: (msg: string, data?: unknown) => warn("Sandbox", msg, data),
  sandboxError: (msg: string, data?: unknown) => error("Sandbox", msg, data),

  // ── Freestyle low-level ops ────────────────────────────────────
  freestyle: (msg: string, data?: unknown) => emit("Freestyle", msg, data),
  freestyleWarn: (msg: string, data?: unknown) => warn("Freestyle", msg, data),
  freestyleError: (msg: string, data?: unknown) => error("Freestyle", msg, data),

  // ── Session registry ───────────────────────────────────────────
  session: (msg: string, data?: unknown) => emit("Session", msg, data),

  // ── LLM provider ───────────────────────────────────────────────
  llm: (msg: string, data?: unknown) => emit("LLM", msg, data),
  llmWarn: (msg: string, data?: unknown) => warn("LLM", msg, data),
  llmError: (msg: string, data?: unknown) => error("LLM", msg, data),

  // ── Tool calls ─────────────────────────────────────────────────
  tool: (name: string, msg: string, data?: unknown) =>
    emit("Tool", `[${name}] ${msg}`, data),
  toolWarn: (name: string, msg: string, data?: unknown) =>
    warn("Tool", `[${name}] ${msg}`, data),
  toolError: (name: string, msg: string, data?: unknown) =>
    error("Tool", `[${name}] ${msg}`, data),

  // ── Chat endpoint ──────────────────────────────────────────────
  chat: (msg: string, data?: unknown) => emit("Chat", msg, data),
  chatWarn: (msg: string, data?: unknown) => warn("Chat", msg, data),
  chatError: (msg: string, data?: unknown) => error("Chat", msg, data),

  // ── Build endpoint ─────────────────────────────────────────────
  build: (msg: string, data?: unknown) => emit("Build", msg, data),
  buildWarn: (msg: string, data?: unknown) => warn("Build", msg, data),
  buildError: (msg: string, data?: unknown) => error("Build", msg, data),

  // ── Preview / serve ────────────────────────────────────────────
  preview: (msg: string, data?: unknown) => emit("Preview", msg, data),
  previewWarn: (msg: string, data?: unknown) => warn("Preview", msg, data),
  previewError: (msg: string, data?: unknown) => error("Preview", msg, data),

  // ── Environment ────────────────────────────────────────────────
  env: (msg: string, data?: unknown) => emit("Env", msg, data),
  envWarn: (msg: string, data?: unknown) => warn("Env", msg, data),
  envError: (msg: string, data?: unknown) => error("Env", msg, data),

  // ── Request / Response ─────────────────────────────────────────
  request: (msg: string, data?: unknown) => emit("Request", msg, data),
  requestWarn: (msg: string, data?: unknown) => warn("Request", msg, data),
  requestError: (msg: string, data?: unknown) => error("Request", msg, data),

  response: (msg: string, data?: unknown) => emit("Response", msg, data),
  responseWarn: (msg: string, data?: unknown) => warn("Response", msg, data),
  responseError: (msg: string, data?: unknown) => error("Response", msg, data),

  // ── General Error ──────────────────────────────────────────────
  error: (msg: string, data?: unknown) => emit("Error", msg, data),

  // ── Middleware ─────────────────────────────────────────────────
  middleware: (msg: string, data?: unknown) => emit("Middleware", msg, data),
  middlewareWarn: (msg: string, data?: unknown) => warn("Middleware", msg, data),
  middlewareError: (msg: string, data?: unknown) => error("Middleware", msg, data),

  // ── Cookies ────────────────────────────────────────────────────
  cookie: (msg: string, data?: unknown) => emit("Cookie", msg, data),
  cookieWarn: (msg: string, data?: unknown) => warn("Cookie", msg, data),
  cookieError: (msg: string, data?: unknown) => error("Cookie", msg, data),

  // ── Headers ────────────────────────────────────────────────────
  header: (msg: string, data?: unknown) => emit("Header", msg, data),
  headerWarn: (msg: string, data?: unknown) => warn("Header", msg, data),
  headerError: (msg: string, data?: unknown) => error("Header", msg, data),
};
