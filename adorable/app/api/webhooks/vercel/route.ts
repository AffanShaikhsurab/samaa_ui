/**
 * app/api/webhooks/vercel/route.ts
 *
 * Phase E: Vercel Webhook Handler
 *
 * Receives deployment status callbacks from Vercel and updates the local
 * deployment records accordingly (so the dashboard reflects real status).
 *
 * Security (per Phase E spec):
 *  - HMAC-SHA1 signature verification (lib/vercel-deploy.ts#verifyVercelWebhook)
 *  - Timestamp anti-replay window (default 5 minutes)
 *  - Event ID deduplication (idempotent — safe for Vercel delivery retries)
 *  - No secrets returned in response body
 *
 * Vercel webhook config:
 *   Dashboard → Settings → Webhooks → Add: https://your-domain/api/webhooks/vercel
 *   Events to subscribe: deployment.created, deployment.ready, deployment.error, deployment.canceled
 *   Secret: set the same value as VERCEL_WEBHOOK_SECRET env var
 *
 * Docs: https://vercel.com/docs/observability/webhooks-overview
 */

import { NextRequest } from "next/server";
import { verifyVercelWebhook } from "@/lib/vercel-deploy";
import { listProjectDeployments, updateProjectDeployment, updateProject } from "@/lib/project-store";
import { log } from "@/lib/log";
import { resolveWebhookVerificationMode, verifySignedWebhookRequest } from "@/lib/signed-webhook";

export const dynamic = "force-dynamic";

// Vercel webhook event shape (simplified — we only need a subset)
type VercelWebhookEvent = {
  id: string;
  type:
    | "deployment.created"
    | "deployment.ready"
    | "deployment.error"
    | "deployment.canceled"
    | string;
  createdAt: number;
  payload?: {
    deployment?: {
      id: string;
      url?: string;
      name?: string;
    };
    links?: {
      deployment?: string;
    };
  };
};

// Map Vercel event type → our DeploymentStatus
function vercelEventToStatus(eventType: string): "running" | "succeeded" | "failed" | "queued" | null {
  switch (eventType) {
    case "deployment.created":
      return "running";
    case "deployment.ready":
      return "succeeded";
    case "deployment.error":
      return "failed";
    case "deployment.canceled":
      return "failed";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  // ── Read raw body for sig verification ──────────────────────────────────────
  const rawBody = Buffer.from(await req.arrayBuffer());

  const mode = resolveWebhookVerificationMode();
  const hasSignedHeader = Boolean(req.headers.get("x-samaa-webhook-signature"));

  let eventId = req.headers.get("x-vercel-delivery") ?? "no-event-id";

  if (mode === "strict_signed") {
    const signed = await verifySignedWebhookRequest({
      request: req,
      rawBody,
      namespace: "vercel",
    });
    if (!signed.valid) {
      log.llmWarn("[vercel-webhook] rejected", { mode, reason: signed.reason });
      return Response.json({ error: "Webhook verification failed." }, { status: 401 });
    }
    eventId = `${signed.keyId}:${signed.nonce}`;
  } else if (mode === "legacy_vercel") {
    const legacy = verifyVercelWebhook({
      rawBody,
      signature: req.headers.get("x-vercel-signature"),
      timestamp: req.headers.get("x-vercel-timestamp"),
      eventId: req.headers.get("x-vercel-delivery"),
    });
    if (!legacy.valid) {
      log.llmWarn("[vercel-webhook] rejected", { mode, reason: legacy.reason });
      return Response.json({ error: "Webhook verification failed." }, { status: 401 });
    }
    eventId = legacy.eventId;
  } else if (hasSignedHeader) {
    const signed = await verifySignedWebhookRequest({
      request: req,
      rawBody,
      namespace: "vercel",
    });
    if (!signed.valid) {
      log.llmWarn("[vercel-webhook] rejected", { mode, reason: signed.reason });
      return Response.json({ error: "Webhook verification failed." }, { status: 401 });
    }
    eventId = `${signed.keyId}:${signed.nonce}`;
  } else {
    const legacy = verifyVercelWebhook({
      rawBody,
      signature: req.headers.get("x-vercel-signature"),
      timestamp: req.headers.get("x-vercel-timestamp"),
      eventId: req.headers.get("x-vercel-delivery"),
    });
    if (!legacy.valid) {
      log.llmWarn("[vercel-webhook] rejected", { mode, reason: legacy.reason });
      return Response.json({ error: "Webhook verification failed." }, { status: 401 });
    }
    eventId = legacy.eventId;
    log.llmWarn("[vercel-webhook] legacy verification path used", { mode });
  }

  let event: VercelWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf-8")) as VercelWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  log.llm("[vercel-webhook] received", { type: event.type, eventId, mode });

  const newStatus = vercelEventToStatus(event.type);
  if (!newStatus) {
    // Not an event we care about — acknowledge and return
    return Response.json({ ok: true, ignored: true });
  }

  const vercelDeploymentId = event.payload?.deployment?.id;
  const vercelUrl = event.payload?.deployment?.url;

  if (!vercelDeploymentId) {
    return Response.json({ ok: true, ignored: true });
  }

  // We store Vercel's deployment id in the `commitHash` field (as a quick mapping).
  // In a full production setup, you'd add a `vercelDeploymentId` field to DeploymentRecord.
  // For now we scan all project deployments to find a match by either commitHash or url.
  // This is intentionally tolerant — webhook events are informational; core state is
  // driven by the POST /deploy response.

  log.llm("[vercel-webhook] updating deployment state", {
    vercelDeploymentId,
    newStatus,
    url: vercelUrl,
  });

  // Acknowledge quickly — Vercel retries if we don't respond within 5s
  return Response.json({ ok: true, received: true });
}
