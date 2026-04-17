/**
 * app/api/templates/route.ts
 *
 * Phase F: Templates Gallery API
 *
 * GET  /api/templates            — list curated templates (with quality score, category)
 * GET  /api/templates?id=xxx     — get single template by id
 *
 * Feature flag: TEMPLATES_V1=true
 *
 * Security:
 *  - Clerk-authenticated (via middleware)
 *  - Curated only — no unvetted community uploads in first release (Phase F spec)
 *  - Template instantiation (create session) is handled by POST /api/builder/sessions
 *    which enforces its own auth + queue admission controls
 *
 * Acceptance criteria (Phase F):
 *  - New users reach first meaningful preview at least 25% faster via templates
 *  - Template-generated projects must pass baseline smoke tests (session creates and
 *    build job is enqueued)
 */

import { NextRequest } from "next/server";
import { TEMPLATES } from "@/lib/templates-data";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function featureEnabled() {
  return process.env.TEMPLATES_V1 === "true";
}

export async function GET(req: NextRequest) {
  if (!featureEnabled()) {
    return Response.json({ error: "Templates feature is disabled. Set TEMPLATES_V1=true." }, { status: 404 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) {
      return Response.json({ error: "Template not found." }, { status: 404 });
    }
    return Response.json({ template });
  }

  const category = url.searchParams.get("category");
  const complexity = url.searchParams.get("complexity");

  let templates = [...TEMPLATES];
  if (category && category !== "all") {
    templates = templates.filter((t) => t.category === category);
  }
  if (complexity) {
    templates = templates.filter((t) => t.complexity === complexity);
  }

  return Response.json({ templates, total: templates.length });
}
