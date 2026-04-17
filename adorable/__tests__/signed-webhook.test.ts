import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSignedWebhookCanonicalPayloadForTest,
  verifySignedWebhookRequest,
} from "@/lib/signed-webhook";

function buildSignedRequest(input: {
  secret: string;
  keyId: string;
  timestamp: string;
  nonce: string;
  method?: string;
  path?: string;
  body?: string;
}): { request: Request; rawBody: Buffer } {
  const method = input.method ?? "POST";
  const path = input.path ?? "/api/webhooks/vercel";
  const bodyText = input.body ?? "{\"ok\":true}";
  const rawBody = Buffer.from(bodyText, "utf-8");
  const canonical = buildSignedWebhookCanonicalPayloadForTest({
    method,
    path,
    timestamp: input.timestamp,
    nonce: input.nonce,
    rawBody,
  });
  const signature = createHmac("sha256", input.secret).update(canonical).digest("hex");

  const request = new Request(`https://example.test${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-samaa-webhook-key-id": input.keyId,
      "x-samaa-webhook-timestamp": input.timestamp,
      "x-samaa-webhook-nonce": input.nonce,
      "x-samaa-webhook-signature": `v1=${signature}`,
    },
    body: rawBody,
  });

  return { request, rawBody };
}

describe("signed webhook verifier", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    process.env.SIGNED_WEBHOOK_KEYS = JSON.stringify({ primary: "secret-1" });
    process.env.SIGNED_WEBHOOK_MAX_SKEW_MS = "300000";
    process.env.SIGNED_WEBHOOK_REPLAY_TTL_MS = "600000";
    delete process.env.ALLOW_INSECURE_IN_MEMORY_WEBHOOK_REPLAY_CACHE;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SIGNED_WEBHOOK_KEYS;
    delete process.env.SIGNED_WEBHOOK_MAX_SKEW_MS;
    delete process.env.SIGNED_WEBHOOK_REPLAY_TTL_MS;
    delete process.env.ALLOW_INSECURE_IN_MEMORY_WEBHOOK_REPLAY_CACHE;
  });

  it("accepts a valid signed webhook", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const { request, rawBody } = buildSignedRequest({
      secret: "secret-1",
      keyId: "primary",
      timestamp,
      nonce: "nonce-valid-1",
    });

    const result = await verifySignedWebhookRequest({ request, rawBody, namespace: "vercel" });
    expect(result.valid).toBe(true);
  });

  it("rejects stale timestamps", async () => {
    const staleTimestamp = String(Math.floor((Date.now() - 10 * 60 * 1000) / 1000));
    const { request, rawBody } = buildSignedRequest({
      secret: "secret-1",
      keyId: "primary",
      timestamp: staleTimestamp,
      nonce: "nonce-stale-1",
    });

    const result = await verifySignedWebhookRequest({ request, rawBody, namespace: "vercel" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("timestamp_out_of_window");
    }
  });

  it("rejects replayed nonce for the same key", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const first = buildSignedRequest({
      secret: "secret-1",
      keyId: "primary",
      timestamp,
      nonce: "nonce-replay-1",
    });

    const firstResult = await verifySignedWebhookRequest({ request: first.request, rawBody: first.rawBody, namespace: "vercel" });
    expect(firstResult.valid).toBe(true);

    const second = buildSignedRequest({
      secret: "secret-1",
      keyId: "primary",
      timestamp,
      nonce: "nonce-replay-1",
    });
    const secondResult = await verifySignedWebhookRequest({ request: second.request, rawBody: second.rawBody, namespace: "vercel" });
    expect(secondResult.valid).toBe(false);
    if (!secondResult.valid) {
      expect(secondResult.reason).toBe("replay_nonce");
    }
  });

  it("rejects invalid signatures", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const { request, rawBody } = buildSignedRequest({
      secret: "wrong-secret",
      keyId: "primary",
      timestamp,
      nonce: "nonce-bad-signature",
    });

    const result = await verifySignedWebhookRequest({ request, rawBody, namespace: "vercel" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("signature_mismatch");
    }
  });
});
