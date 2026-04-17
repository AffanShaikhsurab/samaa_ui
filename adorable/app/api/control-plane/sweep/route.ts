import { NextRequest } from "next/server";
import { runControlPlaneSweeper } from "@/lib/control-plane";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.CONTROL_PLANE_V2 !== "true") {
    return Response.json({ error: "Control plane sweeper is disabled." }, { status: 404 });
  }

  const expected = process.env.CONTROL_PLANE_SWEEP_TOKEN?.trim();
  const provided = req.headers.get("x-control-plane-sweep-token")?.trim();
  if (!expected || !provided || provided !== expected) {
    return Response.json({ error: "Unauthorized sweeper trigger." }, { status: 403 });
  }

  const result = await runControlPlaneSweeper();
  return Response.json({ ok: true, ...result });
}
