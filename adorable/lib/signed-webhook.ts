import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerificationMode = "strict_signed" | "legacy_vercel" | "dual_migration";

export type SignedWebhookVerifyResult =
  | { valid: true; keyId: string; timestampMs: number; nonce: string }
  | {
      valid: false;
      reason:
        | "missing_key"
        | "missing_signature"
        | "missing_timestamp"
        | "missing_nonce"
        | "invalid_timestamp"
        | "timestamp_out_of_window"
        | "unknown_key_id"
        | "signature_mismatch"
        | "replay_nonce"
        | "replay_cache_capacity_exceeded"
        | "replay_cache_unavailable";
    };

type ParsedHeaders = {
  keyId: string | null;
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
};

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_REPLAY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_REPLAY_MAX_ENTRIES = 10_000;

const replayCache = new Map<string, number>();

function resolveMode(): WebhookVerificationMode {
  const raw = (process.env.WEBHOOK_VERIFICATION_MODE ?? "").trim().toLowerCase();
  if (raw === "strict_signed" || raw === "legacy_vercel" || raw === "dual_migration") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "strict_signed" : "dual_migration";
}

export function resolveWebhookVerificationMode(): WebhookVerificationMode {
  return resolveMode();
}

function resolveMaxSkewMs(): number {
  const parsed = Number.parseInt(process.env.SIGNED_WEBHOOK_MAX_SKEW_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_SKEW_MS;
  return parsed;
}

function resolveReplayTtlMs(maxSkewMs: number): number {
  const parsed = Number.parseInt(process.env.SIGNED_WEBHOOK_REPLAY_TTL_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(DEFAULT_REPLAY_TTL_MS, maxSkewMs * 2);
  return Math.max(parsed, maxSkewMs * 2);
}

function resolveReplayMaxEntries(): number {
  const parsed = Number.parseInt(process.env.SIGNED_WEBHOOK_REPLAY_MAX_ENTRIES ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REPLAY_MAX_ENTRIES;
  return parsed;
}

function parseSignedWebhookKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const jsonRaw = process.env.SIGNED_WEBHOOK_KEYS?.trim();

  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as Record<string, string>;
      for (const [keyId, secret] of Object.entries(parsed)) {
        const key = keyId.trim();
        const value = String(secret ?? "").trim();
        if (!key || !value) continue;
        keys.set(key, value);
      }
    } catch {
      // Ignore malformed JSON and continue to fallbacks.
    }
  }

  const fallback = process.env.SIGNED_WEBHOOK_SECRET?.trim();
  if (fallback) {
    keys.set("default", fallback);
  }

  return keys;
}

function parseTimestampMs(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) return null;
    // Interpret short epoch values as seconds.
    return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isFinite(parsedDate)) return null;
  return parsedDate;
}

function parseSignatureHex(signature: string | null): string | null {
  if (!signature) return null;
  const normalized = signature.trim().replace(/^v1=/i, "");
  if (!/^[a-fA-F0-9]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return null;
  }
  return normalized.toLowerCase();
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readHeaders(request: Request): ParsedHeaders {
  return {
    keyId: request.headers.get("x-samaa-webhook-key-id"),
    timestamp: request.headers.get("x-samaa-webhook-timestamp"),
    nonce: request.headers.get("x-samaa-webhook-nonce"),
    signature: request.headers.get("x-samaa-webhook-signature"),
  };
}

function canonicalPayload(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  rawBody: Buffer;
}): string {
  const bodyHash = createHash("sha256").update(input.rawBody).digest("hex");
  return [input.method.toUpperCase(), input.path, input.timestamp, input.nonce, bodyHash].join("\n");
}

function cleanupExpiredReplayEntries(nowMs: number, maxChecks = 256): void {
  let checked = 0;
  for (const [key, expiresAt] of replayCache) {
    if (expiresAt <= nowMs) {
      replayCache.delete(key);
    }
    checked += 1;
    if (checked >= maxChecks) {
      break;
    }
  }
}

function reserveReplayNonce(replayKey: string, ttlMs: number): SignedWebhookVerifyResult {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_IN_MEMORY_WEBHOOK_REPLAY_CACHE !== "true") {
    return { valid: false, reason: "replay_cache_unavailable" };
  }

  const nowMs = Date.now();
  cleanupExpiredReplayEntries(nowMs);

  const existing = replayCache.get(replayKey);
  if (existing && existing > nowMs) {
    return { valid: false, reason: "replay_nonce" };
  }

  const maxEntries = resolveReplayMaxEntries();
  if (replayCache.size >= maxEntries) {
    cleanupExpiredReplayEntries(nowMs, maxEntries);
    if (replayCache.size >= maxEntries) {
      return { valid: false, reason: "replay_cache_capacity_exceeded" };
    }
  }

  replayCache.set(replayKey, nowMs + ttlMs);
  return { valid: true, keyId: "", timestampMs: nowMs, nonce: "" };
}

export function buildSignedWebhookCanonicalPayloadForTest(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  rawBody: Buffer;
}): string {
  return canonicalPayload(input);
}

export async function verifySignedWebhookRequest(options: {
  request: Request;
  rawBody: Buffer;
  namespace?: string;
}): Promise<SignedWebhookVerifyResult> {
  const headers = readHeaders(options.request);
  const keys = parseSignedWebhookKeys();

  if (keys.size === 0) {
    return { valid: false, reason: "missing_key" };
  }
  if (!headers.signature) {
    return { valid: false, reason: "missing_signature" };
  }
  if (!headers.timestamp) {
    return { valid: false, reason: "missing_timestamp" };
  }
  if (!headers.nonce) {
    return { valid: false, reason: "missing_nonce" };
  }

  const keyId = headers.keyId?.trim() || (keys.size === 1 ? [...keys.keys()][0] : "");
  if (!keyId) {
    return { valid: false, reason: "unknown_key_id" };
  }

  const secret = keys.get(keyId);
  if (!secret) {
    return { valid: false, reason: "unknown_key_id" };
  }

  const signatureHex = parseSignatureHex(headers.signature);
  if (!signatureHex) {
    return { valid: false, reason: "signature_mismatch" };
  }

  const timestampMs = parseTimestampMs(headers.timestamp);
  if (timestampMs === null) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const maxSkewMs = resolveMaxSkewMs();
  if (Math.abs(Date.now() - timestampMs) > maxSkewMs) {
    return { valid: false, reason: "timestamp_out_of_window" };
  }

  const url = new URL(options.request.url);
  const payload = canonicalPayload({
    method: options.request.method,
    path: url.pathname,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    rawBody: options.rawBody,
  });

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex");
  if (!safeEqualHex(signatureHex, expectedSignature)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  const replayNamespace = options.namespace?.trim() || "webhook";
  const replayTtlMs = resolveReplayTtlMs(maxSkewMs);
  const replayKey = `${replayNamespace}:${keyId}:${headers.nonce}`;
  const reserved = reserveReplayNonce(replayKey, replayTtlMs);
  if (!reserved.valid) {
    return reserved;
  }

  return {
    valid: true,
    keyId,
    timestampMs,
    nonce: headers.nonce,
  };
}
