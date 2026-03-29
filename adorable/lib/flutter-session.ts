/**
 * Per-session Flutter sandbox registry.
 * Uses a module-level Map keyed by sessionId (a cookie value).
 * This is appropriate for demo / single-server deployments.
 * For multi-instance deployments, swap the Map for a Redis/KV store.
 */
import { Sandbox } from "e2b";
import { log } from "./log";
import { TEMPLATE_NAME } from "./e2b/template";

const TEMPLATE_NAME_E2B = "flutter-web-base-v1";
const MAX_SANDBOX_TIMEOUT_MS = 600_000;

type E2BVMSession = Sandbox & {
  __vmId?: string;
};

const sessionSandboxes = new Map<string, E2BVMSession>();

export async function getOrCreateSandbox(sessionId: string): Promise<E2BVMSession> {
  const existing = sessionSandboxes.get(sessionId);
  if (existing) {
    log.session(`reusing E2B sandbox for session ${sessionId.slice(0, 8)}…`, {
      vmId: existing.__vmId,
      totalSessions: sessionSandboxes.size,
    });
    return existing;
  }

  log.session(`creating new E2B sandbox for session ${sessionId.slice(0, 8)}…`, {
    totalSessions: sessionSandboxes.size,
    template: TEMPLATE_NAME_E2B,
    timeoutMs: MAX_SANDBOX_TIMEOUT_MS,
  });

  try {
    const sandbox = await Sandbox.create(TEMPLATE_NAME_E2B, {
      timeoutMs: MAX_SANDBOX_TIMEOUT_MS,
    }) as E2BVMSession;

    sandbox.__vmId = sandbox.sandboxId;
    sessionSandboxes.set(sessionId, sandbox);

    log.session(`E2B sandbox registered`, {
      sessionId: sessionId.slice(0, 8),
      vmId: sandbox.__vmId,
      totalSessions: sessionSandboxes.size,
    });

    return sandbox;
  } catch (error) {
    log.session(`E2B sandbox creation FAILED`, {
      sessionId: sessionId.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    });
    throw error;
  }
}

export function getSandbox(sessionId: string): E2BVMSession | undefined {
  const vm = sessionSandboxes.get(sessionId);
  log.session(vm ? `found E2B sandbox` : `no E2B sandbox found`, {
    sessionId: sessionId.slice(0, 8),
  });
  return vm;
}

export function removeSandbox(sessionId: string): void {
  const sandbox = sessionSandboxes.get(sessionId);
  if (sandbox) {
    sandbox.kill().catch(() => {});
  }
  sessionSandboxes.delete(sessionId);
  log.session(`removed E2B sandbox`, {
    sessionId: sessionId.slice(0, 8),
    remaining: sessionSandboxes.size,
  });
}
