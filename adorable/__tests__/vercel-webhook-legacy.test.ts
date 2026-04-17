import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyVercelWebhook } from "@/lib/vercel-deploy";

describe("legacy vercel webhook verifier", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const mutableEnv = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    delete process.env.VERCEL_WEBHOOK_SECRET;
    delete process.env.ALLOW_INSECURE_LEGACY_WEBHOOK;
  });

  afterEach(() => {
    mutableEnv.NODE_ENV = originalNodeEnv;
    delete process.env.VERCEL_WEBHOOK_SECRET;
    delete process.env.ALLOW_INSECURE_LEGACY_WEBHOOK;
  });

  it("fails closed when secret is missing", () => {
    mutableEnv.NODE_ENV = "production";

    const result = verifyVercelWebhook({
      rawBody: Buffer.from("{}", "utf-8"),
      signature: null,
      timestamp: new Date().toISOString(),
      eventId: "evt_1",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("missing_secret");
    }
  });

  it("accepts insecure legacy mode only in explicit development override", () => {
    mutableEnv.NODE_ENV = "development";
    process.env.ALLOW_INSECURE_LEGACY_WEBHOOK = "true";

    const result = verifyVercelWebhook({
      rawBody: Buffer.from("{}", "utf-8"),
      signature: null,
      timestamp: new Date().toISOString(),
      eventId: "evt_2",
    });

    expect(result.valid).toBe(true);
  });

  it("verifies signature when secret is configured", () => {
    mutableEnv.NODE_ENV = "production";
    process.env.VERCEL_WEBHOOK_SECRET = "vercel-secret";

    const rawBody = Buffer.from('{"event":"deployment.ready"}', "utf-8");
    const signature = `sha1=${createHmac("sha1", "vercel-secret").update(rawBody).digest("hex")}`;

    const result = verifyVercelWebhook({
      rawBody,
      signature,
      timestamp: new Date().toISOString(),
      eventId: "evt_3",
    });

    expect(result.valid).toBe(true);
  });
});
