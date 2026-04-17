import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { getProjectCheckpoints } from "@/lib/project-store";
import { resolveResumePoint, buildPhaseTimeline } from "@/lib/checkpoint";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const owned = await requireOwnedProject(id);
  if ("response" in owned) return owned.response;

  const project = owned.project;
  const checkpoints = await getProjectCheckpoints(id);
  const projectWithCheckpoints = { ...project, checkpoints };
  const analysis = resolveResumePoint(projectWithCheckpoints);
  const timeline = buildPhaseTimeline(projectWithCheckpoints, analysis);

  log.session("GET /checkpoints", {
    id,
    lastSealed: analysis.lastSealed,
    nextResumable: analysis.nextResumable,
    completedCount: analysis.completedPhases.length,
    stuckPhase: analysis.stuckPhase,
  });

  return Response.json({ checkpoints, analysis, timeline });
}
