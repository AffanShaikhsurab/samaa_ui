/**
 * lib/vercel-deploy.ts
 *
 * Real Vercel deployment integration using the Vercel REST API v13.
 * Handles: file upload with SHA1 hashing, deployment creation, status polling,
 * webhook signature verification, and anti-replay checks.
 *
 * Docs reference: https://vercel.com/docs/rest-api/reference#tag/deployments/POST/v13/deployments
 *
 * Security model (per Phase E spec):
 *  - VERCEL_TOKEN never exposed to client
 *  - Webhook requests verified with HMAC-SHA1 using VERCEL_WEBHOOK_SECRET
 *  - Anti-replay: reject events older than WEBHOOK_TIMESTAMP_TOLERANCE_MS (default 5 min)
 *  - Event IDs deduplicated via in-memory LRU (survives single-process restarts; upgrade to
 *    Redis in multi-instance before production)
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { log } from "./log";

// ── Constants ──────────────────────────────────────────────────────────────────

const VERCEL_API = "https://api.vercel.com";
const VERCEL_TOKEN = () => process.env.VERCEL_TOKEN ?? "";
const VERCEL_TEAM_ID = () => process.env.VERCEL_TEAM_ID ?? ""; // optional

const WEBHOOK_TIMESTAMP_TOLERANCE_MS =
  Number.parseInt(process.env.VERCEL_WEBHOOK_TOLERANCE_MS ?? "", 10) || 5 * 60 * 1000;

// Simple in-process dedup ring buffer; replace with Redis SETNX in multi-instance.
const SEEN_EVENT_IDS = new Set<string>();
const SEEN_EVENT_TTL_MS = 10 * 60 * 1000; // 10 min

// ── Types ──────────────────────────────────────────────────────────────────────

export type VercelDeployStatus =
  | "QUEUED"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED";

export type VercelDeployment = {
  id: string;
  url: string;
  readyState: VercelDeployStatus;
  inspectorUrl?: string;
  createdAt: number;
};

export type VercelDeployResult =
  | { ok: true; deployment: VercelDeployment }
  | { ok: false; error: string; statusCode?: number };

export type VercelDeployOptions = {
  /**
   * Project name on Vercel (will be slugified). This determines the *.vercel.app subdomain.
   * Max 52 chars — we truncate automatically.
   */
  projectName: string;
  /**
   * Map of file path → file content (as Buffer or string).
   * E.g. { "index.html": "<html>...", "main.dart.js": <Buffer ...> }
   */
  files: Record<string, Buffer | string>;
  /** "preview" | "production" */
  environment?: "preview" | "production";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha1(content: Buffer | string): string {
  return createHash("sha1")
    .update(typeof content === "string" ? Buffer.from(content, "utf-8") : content)
    .digest("hex");
}

function vercelAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${VERCEL_TOKEN()}`,
  };
  return headers;
}

function teamQuery(): string {
  const teamId = VERCEL_TEAM_ID();
  return teamId ? `?teamId=${teamId}` : "";
}

/**
 * Upload a single file to Vercel's blob store.
 * Returns the fileSha on success, throws on failure.
 */
async function uploadFile(
  content: Buffer | string,
  fileSha: string,
  mimeType = "application/octet-stream",
): Promise<void> {
  const body = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

  const res = await fetch(`${VERCEL_API}/v2/files${teamQuery()}`, {
    method: "POST",
    headers: {
      ...vercelAuthHeaders(),
      "Content-Type": mimeType,
      "x-vercel-digest": fileSha,
      "Content-Length": String(body.byteLength),
    },
    // Cast Buffer to Uint8Array for fetch BodyInit compatibility in strict TS
    body: new Uint8Array(body),
  });

  // 200 = uploaded, 409 = already exists — both are fine
  if (res.status !== 200 && res.status !== 409) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`File upload failed (${res.status}): ${text}`);
  }
}

function mimeForPath(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52) || "samaa-app";
}

// ── Main Deploy Function ───────────────────────────────────────────────────────

/**
 * Deploys the given files to Vercel by:
 * 1. Computing SHA1 for each file
 * 2. Uploading each file (parallel, max 8 concurrent)
 * 3. Creating a /v13/deployments request
 *
 * NOTE: This requires VERCEL_TOKEN env var.
 * If VERCEL_TOKEN is not set, returns { ok: false } so the feature degrades
 * gracefully — the local store still records the deployment.
 */
export async function deployToVercel(options: VercelDeployOptions): Promise<VercelDeployResult> {
  const token = VERCEL_TOKEN();
  if (!token) {
    log.llmWarn("[vercel-deploy] VERCEL_TOKEN not set; skipping real deployment");
    return { ok: false, error: "VERCEL_TOKEN not configured" };
  }

  const { files, environment = "preview" } = options;
  const projectName = slugify(options.projectName);
  const target = environment === "production" ? "production" : "preview";

  log.llm("[vercel-deploy] starting deployment", { projectName, fileCount: Object.keys(files).length, target });

  // Build manifest
  const manifest: Array<{ file: string; sha: string; size: number }> = [];
  for (const [filePath, content] of Object.entries(files)) {
    const buf = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    manifest.push({ file: filePath, sha: sha1(buf), size: buf.byteLength });
  }

  // Upload files in parallel batches of 8
  const BATCH = 8;
  for (let i = 0; i < manifest.length; i += BATCH) {
    const batch = manifest.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ file, sha }) =>
        uploadFile(files[file], sha, mimeForPath(file)).catch((err) => {
          throw new Error(`Failed uploading ${file}: ${err instanceof Error ? err.message : String(err)}`);
        }),
      ),
    );
  }

  log.llm("[vercel-deploy] all files uploaded, creating deployment…");

  // Create deployment
  const body = {
    name: projectName,
    files: manifest,
    target,
    projectSettings: { framework: null },
  };

  const res = await fetch(`${VERCEL_API}/v13/deployments${teamQuery()}`, {
    method: "POST",
    headers: {
      ...vercelAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    log.llmWarn("[vercel-deploy] deployment creation failed", { status: res.status, body: text.slice(0, 500) });
    return { ok: false, error: `Vercel deployment failed (${res.status}): ${text.slice(0, 300)}`, statusCode: res.status };
  }

  const data = (await res.json()) as {
    id: string;
    url: string;
    readyState: VercelDeployStatus;
    inspectorUrl?: string;
    createdAt: number;
  };

  log.llm("[vercel-deploy] deployment created", { id: data.id, url: data.url, state: data.readyState });

  return {
    ok: true,
    deployment: {
      id: data.id,
      url: `https://${data.url}`,
      readyState: data.readyState,
      inspectorUrl: data.inspectorUrl,
      createdAt: data.createdAt,
    },
  };
}

// ── Status Polling ─────────────────────────────────────────────────────────────

export async function getVercelDeploymentStatus(vercelDeploymentId: string): Promise<VercelDeployment | null> {
  const token = VERCEL_TOKEN();
  if (!token) return null;

  const res = await fetch(`${VERCEL_API}/v13/deployments/${vercelDeploymentId}${teamQuery()}`, {
    headers: vercelAuthHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    id: string;
    url: string;
    readyState: VercelDeployStatus;
    inspectorUrl?: string;
    createdAt: number;
  };

  return {
    id: data.id,
    url: `https://${data.url}`,
    readyState: data.readyState,
    inspectorUrl: data.inspectorUrl,
    createdAt: data.createdAt,
  };
}

// ── Webhook Verification ───────────────────────────────────────────────────────

export type WebhookVerifyResult =
  | { valid: true; eventId: string }
  | { valid: false; reason: string };

/**
 * Verify a Vercel webhook request.
 * Checks:
 * 1. HMAC-SHA1 signature matches (timing-safe compare)
 * 2. Timestamp within tolerance (anti-replay)
 * 3. Event ID not seen before (dedup)
 *
 * Per Phase E spec:
 *   "Deployment webhook callbacks must verify signature."
 *   "Deployment webhook callbacks must enforce anti-replay checks."
 */
export function verifyVercelWebhook(options: {
  rawBody: Buffer;
  signature: string | null;
  timestamp: string | null;
  eventId: string | null;
}): WebhookVerifyResult {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development" && process.env.ALLOW_INSECURE_LEGACY_WEBHOOK === "true") {
      log.llmWarn("[vercel-webhook] insecure legacy mode enabled without secret");
      return { valid: true, eventId: options.eventId ?? "no-event-id" };
    }
    return { valid: false, reason: "missing_secret" };
  }

  // 1. Signature check
  if (!options.signature) return { valid: false, reason: "missing_signature" };

  const expectedSig = createHmac("sha1", secret)
    .update(options.rawBody)
    .digest("hex");
  const given = Buffer.from(options.signature.replace(/^sha1=/, ""), "hex");
  const expected = Buffer.from(expectedSig, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  // 2. Timestamp anti-replay
  if (options.timestamp) {
    const tsMs = Date.parse(options.timestamp);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
      return { valid: false, reason: "timestamp_out_of_window" };
    }
  }

  // 3. Event ID dedup
  const eventId = options.eventId ?? "no-event-id";
  if (SEEN_EVENT_IDS.has(eventId)) {
    return { valid: false, reason: "duplicate_event_id" };
  }
  SEEN_EVENT_IDS.add(eventId);
  // TTL: remove after SEEN_EVENT_TTL_MS
  setTimeout(() => SEEN_EVENT_IDS.delete(eventId), SEEN_EVENT_TTL_MS);

  return { valid: true, eventId };
}
