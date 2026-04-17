import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { listBuildJobsForProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if ("response" in owned) {
    return owned.response;
  }
  const project = owned.project;

  const buildJobs = await listBuildJobsForProject(id);
  let retryScheduledCount = 0;
  let deadLetterCount = 0;
  const queueJobs: typeof buildJobs = [];
  for (const job of buildJobs) {
    if (job.status === "retry_scheduled") {
      retryScheduledCount += 1;
      if (queueJobs.length < 25) queueJobs.push(job);
    } else if (job.status === "dead_letter") {
      deadLetterCount += 1;
      if (queueJobs.length < 25) queueJobs.push(job);
    }
  }

  return Response.json({
    artifacts: project.artifacts,
    snapshots: project.snapshots,
    buildHistory: project.buildHistory,
    buildJobs,
    queueDiagnostics: {
      retryScheduledCount,
      deadLetterCount,
      jobs: queueJobs,
    },
  });
}
