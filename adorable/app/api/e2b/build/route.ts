import { type NextRequest } from "next/server";
import { buildFlutterApp, type BuildRequest } from "@/lib/e2b/agent-runner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { appName, orgId, files } = body as BuildRequest;

    if (!appName || !orgId || !files || !Array.isArray(files) || files.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Missing required fields: appName, orgId, files (array with at least one file)",
        },
        { status: 400 }
      );
    }

    const buildRequest: BuildRequest = {
      appName,
      orgId,
      files,
    };

    const result = await buildFlutterApp(buildRequest);

    return Response.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    endpoint: "POST /api/e2b/build",
    body: {
      appName: "my-app",
      orgId: "org-123",
      files: [
        {
          path: "lib/main.dart",
          content: "void main() { print('Hello'); }",
        },
      ],
    },
  });
}
