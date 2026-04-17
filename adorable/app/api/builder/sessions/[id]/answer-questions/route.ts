import { NextRequest } from "next/server";
import { requireOwnedProject } from "@/lib/api-auth";
import { toBuilderSession } from "@/lib/builder-session";
import { answerDiscoveryQuestions } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if ("response" in owned) return owned.response;

  const sessionToken = owned.project.sessionToken;
  const providedToken = req.headers.get("x-builder-session-token")?.trim();
  if (!sessionToken || !providedToken || providedToken !== sessionToken) {
    return Response.json({ error: "Unauthorized builder session." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, string>;
  };
  const answers = body.answers ?? {};

  const result = await answerDiscoveryQuestions(id, answers);
  if (!result.ok) {
    if (result.reason === "project_not_found") {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    if (result.reason === "invalid_phase") {
      return Response.json(
        { error: "Question answers can only be submitted during collecting_questions phase." },
        { status: 409 },
      );
    }
    return Response.json(
      {
        error: "All clarification questions must be answered before walkthrough can start.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    session: toBuilderSession(result.project),
  });
}
