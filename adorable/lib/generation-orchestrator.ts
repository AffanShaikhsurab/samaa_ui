import {
  AnclGenerationPipeline,
  type AnclEvent,
  type RequirementsDocument as SdkRequirementsDocument,
} from "@affanshaikhsurab/agent-sdk";
import type { RequirementsDocument } from "@/lib/project-store";
import { allowAll } from "@/lib/discovery-orchestrator";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export type RunGenerationInput = {
  requirements: RequirementsDocument;
  onEvent?: (event: AnclEvent) => void;
};

function resolveProviderConfig() {
  const provider = (process.env.LLM_PROVIDER ?? "openai").trim().toLowerCase();

  if (provider === "anthropic") {
    return {
      provider: { name: "anthropic" },
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? "",
      model: process.env.ANTHROPIC_MODEL ?? process.env.LLM_MODEL ?? "claude-3-7-sonnet-latest",
    };
  }

  return {
    provider: { name: "openai" },
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? DEFAULT_MODEL,
  };
}

export async function runAnclGeneration(input: RunGenerationInput) {
  const provider = resolveProviderConfig();
  const pipeline = new AnclGenerationPipeline({
    compositionConfig: {
      options: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: provider.model,
        provider: provider.provider,
        tools: [],
        permissionChecker: allowAll,
        maxTurns: 24,
        maxToolCallsPerTurn: 6,
        workingDirectory: process.cwd(),
      },
    },
    compilerUrl: process.env.ANCL_COMPILER_URL,
    maxCriticIterations: 2,
    onEvent: input.onEvent,
  });

  return pipeline.run(input.requirements as unknown as SdkRequirementsDocument);
}
