import { type NextRequest } from "next/server";
import { Sandbox } from "e2b";

export async function GET(req: NextRequest) {
  const e2bApiKey = process.env.E2B_API_KEY;

  if (!e2bApiKey) {
    return Response.json({
      status: "not_configured",
      message: "E2B_API_KEY is not set in environment variables.",
      hint: "Create a .env.local file with E2B_API_KEY=your_key",
    });
  }

  try {
    const sandbox = await Sandbox.create("flutter-web-base-v1", {
      apiKey: e2bApiKey,
      timeoutMs: 10000,
    });
    return Response.json({
      status: "ok",
      provider: "e2b",
      sandboxId: sandbox.sandboxId,
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      hint: "Check your E2B API key and network connectivity",
    });
  }
}