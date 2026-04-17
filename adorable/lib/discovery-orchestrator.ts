/**
 * Discovery Orchestrator — Next.js glue for the agent-sdk DiscoveryPipeline.
 *
 * Bridges the API routes to the agent-sdk DiscoveryPipeline.
 * Uses the same LLM priority order as lib/llm-provider.ts:
 *   NVIDIA → Groq → Anthropic → OpenAI
 */

import {
  DiscoveryPipeline,
  type DiscoveryEvent,
  type DiscoveryPipelineResult,
  type PermissionChecker,
} from "@affanshaikhsurab/agent-sdk";

// ---------------------------------------------------------------------------
// Permission checker — allow all tool calls in the server context.
// ---------------------------------------------------------------------------
export const allowAll: PermissionChecker = {
  async check() {
    return "allow";
  },
};

export type RunDiscoveryInput = {
  projectId: string;
  userIntent: string;
  appName?: string;
  onEvent?: (event: DiscoveryEvent) => void;
};

// ---------------------------------------------------------------------------
// Resolve the LLM provider config, mirroring lib/llm-provider.ts priority.
// ---------------------------------------------------------------------------
function resolveProviderConfig(): {
  provider: { name: string; config?: Record<string, unknown> };
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const provider = (process.env.LLM_PROVIDER ?? "openai").trim().toLowerCase();

  // NVIDIA (default in .env.local)
  if (provider === "nvidia" && process.env.NVIDIA_API_KEY) {
    return {
      provider: { name: "openai" }, // openai-compatible
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: process.env.LLM_MODEL ?? "meta/llama-3.3-70b-instruct",
    };
  }

  // Groq
  if (provider === "groq" && process.env.GROQ_API_KEY) {
    return {
      provider: { name: "openai" }, // openai-compatible
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1",
      model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
    };
  }

  // Anthropic
  if (
    (provider === "anthropic" || provider === "claude") &&
    process.env.ANTHROPIC_API_KEY
  ) {
    return {
      provider: { name: "anthropic" },
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? "",
      model: process.env.LLM_MODEL ?? "claude-sonnet-4-20250514",
    };
  }

  // Fallback: try NVIDIA key even if not set as the primary provider
  if (process.env.NVIDIA_API_KEY) {
    return {
      provider: { name: "openai" },
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: process.env.LLM_MODEL ?? "meta/llama-3.3-70b-instruct",
    };
  }

  // Fallback: Groq
  if (process.env.GROQ_API_KEY) {
    return {
      provider: { name: "openai" },
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1",
      model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
    };
  }

  // Last resort: OpenAI
  return {
    provider: { name: "openai" },
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini",
  };
}

export async function runDiscovery(
  input: RunDiscoveryInput,
): Promise<DiscoveryPipelineResult> {
  const cfg = resolveProviderConfig();

  const pipeline = new DiscoveryPipeline({
    compositionConfig: {
      options: {
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        provider: cfg.provider,
        tools: [],
        permissionChecker: allowAll,
        maxTurns: 24,
        maxToolCallsPerTurn: 8,
        workingDirectory: process.cwd(),
      },
    },
    onEvent: input.onEvent,
  });

  return pipeline.run(input.userIntent, input.appName);
}

export type { DiscoveryEvent, DiscoveryPipelineResult };
