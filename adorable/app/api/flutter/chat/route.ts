import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import { streamLlmResponse } from "@/lib/llm-provider";
import { createE2BFlutterTools } from "@/lib/e2b-flutter-tools";
import { getOrCreateSandbox } from "@/lib/flutter-session";
import { log } from "@/lib/log";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

const FLUTTER_SYSTEM_PROMPT = `You are Samaa Flutter — an expert AI Flutter app builder. You help users create, modify, and preview Flutter web applications.

## Your Workflow
When a user describes an app, follow this exact sequence:

1. **Create the project** → call \`flutterCreate\` with a descriptive snake_case name (e.g. \`todo_app\`).
2. **Write all files** → use \`writeFile\` to write every file needed:
   - \`<project>/lib/main.dart\` — main entry point
   - \`<project>/lib/screens/<name>.dart\` — screens
   - \`<project>/lib/widgets/<name>.dart\` — widgets (if needed)
   - \`<project>/pubspec.yaml\` — only if you need extra packages beyond standard Flutter
3. **Install dependencies** → call \`flutterPubGet\` with the project directory.
4. **Build** → call \`flutterBuildWeb\` with the project directory. If build fails, read error logs, fix files, rebuild.
5. **Serve** → call \`flutterServeWeb\` which returns a \`previewUrl\`. **Share this URL clearly in your response.**

## Code Quality
- Use Material 3 (\`useMaterial3: true\`) in MaterialApp
- Use Dart null-safety throughout
- Keep widgets clean and well-separated
- Make the UI responsive and visually polished
- Prefer StatelessWidget + State for simple state management

## Communication Style
- Narrate each step briefly and naturally: "Creating the project...", "Writing the UI...", "Building now..."
- When the preview URL is ready, say: "✅ Your app is ready! Preview it here: <URL>"
- Keep messages concise and enthusiastic

## Error Recovery
If build fails: read the error output, fix the offending files with \`writeFile\` or \`replaceInFile\`, then rebuild. Retry up to 3 times.

## Key Rules
- ALWAYS call \`flutterServeWeb\` at the end to give the user a live preview URL
- NEVER tell the user you are "done" without a preview URL
- The preview URL is interactive — users can click, type, and use the app in their browser
`;

export async function POST(req: NextRequest) {
  const reqT0 = Date.now();
  log.chat("═══════════════════════════════════════════════════════════");
  log.chat(">>> HIT: /api/flutter/chat (POST)");
  log.chat("Request headers", {
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent")?.slice(0, 50),
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
  });

  const payload = (await req.json()) as {
    messages?: UIMessage[];
  };

  const messages = Array.isArray(payload.messages) ? payload.messages : undefined;
  if (!messages) {
    log.chatError("invalid request: messages must be an array");
    return Response.json({ error: "messages must be an array." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const userText =
    lastMessage?.parts
      ?.filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join("") ?? "(no text)";

  log.chat(`received ${messages.length} message(s)`, {
    lastRole: lastMessage?.role,
    lastMessagePreview:
      userText.length > 120 ? userText.slice(0, 120) + "…" : userText,
  });

  const jar = await cookies();
  const userApiKey = jar.get("user-api-key")?.value;
  const userProvider = jar.get("user-api-provider")?.value;

  const hasGlobalKey = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.NVIDIA_API_KEY
  );

  log.chat("API key status", {
    hasGlobalKey,
    hasUserKey: !!userApiKey,
    userProvider,
  });

  if (!hasGlobalKey && !userApiKey) {
    log.chatError("no API key configured");
    return Response.json(
      { error: "No API key configured. Please add your API key in settings." },
      { status: 401 }
    );
  }

  // ── Session-scoped sandbox ────────────────────────────────────
  let sessionId = jar.get("flutter-session-id")?.value;
  const isNewSession = !sessionId;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    log.chat(`new session created: ${sessionId.slice(0, 8)}…`);
  } else {
    log.chat(`existing session: ${sessionId.slice(0, 8)}…`);
  }

  try {
    log.chat("getting or creating sandbox…");
    const sandboxT0 = Date.now();
    const sandbox = await getOrCreateSandbox(sessionId);
    log.chat(`sandbox ready (${((Date.now() - sandboxT0) / 1000).toFixed(1)}s)`, {
      vmId: sandbox.__vmId,
    });

    log.chat("creating Flutter tools…");
    const tools = createE2BFlutterTools(sandbox);
    log.chat("tools created", { toolNames: Object.keys(tools) });

    log.chat("starting LLM stream…");
    const llmT0 = Date.now();
    const llm = await streamLlmResponse({
      system: FLUTTER_SYSTEM_PROMPT,
      messages,
      tools,
      ...(hasGlobalKey ? {} : { apiKey: userApiKey, providerOverride: userProvider }),
    });
    log.chat(`LLM stream initialized (provider: ${llm.provider}, ${Date.now() - llmT0}ms)`);

    log.chat("converting to SSE response…");
    const response = llm.result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
    });

    if (isNewSession) {
      response.headers.set(
        "Set-Cookie",
        `flutter-session-id=${sessionId}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
      );
      log.chat("session cookie set on response");
    }

    log.chat(`responding with SSE stream (${Date.now() - reqT0}ms total setup)`);
    return response;
  } catch (error) {
    log.chatError("chat endpoint error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 800) : undefined,
    });

    if (error instanceof Error) {
      if (error.message.includes("E2B") || error.message.includes("sandbox") || error.message.includes("vm") || error.message.includes("timeout")) {
        return Response.json(
          {
            error: "Sandbox service is unavailable. Please ensure the E2B API is properly configured and running.",
            code: "SANDBOX_UNAVAILABLE"
          },
          { status: 503 }
        );
      }
      if (error.message.includes("API key") || error.message.includes("auth")) {
        return Response.json(
          { error: "Authentication failed. Please check your API key configuration.", code: "AUTH_ERROR" },
          { status: 401 }
        );
      }
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred.", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
