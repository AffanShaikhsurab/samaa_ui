import { createAnthropic } from "@ai-sdk/anthropic";
import {
  createOpenAI,
  type OpenAIResponsesProviderOptions,
} from "@ai-sdk/openai";
import {
  stepCountIs,
  streamText,
  type UIMessage,
  type ToolSet,
  convertToModelMessages,
} from "ai";
import { log } from "./log";

type LlmProviderName = "openai" | "anthropic" | "groq" | "nvidia";

export interface LlmCallSettings {
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamLlmResponseParams {
  system: string;
  messages: UIMessage[];
  tools: ToolSet;
  apiKey?: string;
  providerOverride?: string;
  callSettings?: LlmCallSettings;
}

type StreamLlmResponseResult = {
  result: ReturnType<typeof streamText>;
  provider: LlmProviderName;
};

const DEFAULT_MAX_STEPS = 50;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_RETRIES = 3;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const getProviderName = (override?: string): LlmProviderName => {
  const value = (override ?? process.env["LLM_PROVIDER"])?.toLowerCase().trim();
  if (value === "anthropic" || value === "claude") return "anthropic";
  if (value === "groq") return "groq";
  if (value === "nvidia") return "nvidia";
  return "openai";
};

export const streamLlmResponse = async ({
  system,
  messages,
  tools,
  apiKey,
  providerOverride,
  callSettings,
}: StreamLlmResponseParams): Promise<StreamLlmResponseResult> => {
  const provider = getProviderName(providerOverride);
  const maxRetries = callSettings?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const temperature = callSettings?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = callSettings?.maxTokens;

  log.llm(`initializing provider: ${provider}`, {
    hasApiKey: !!apiKey,
    messageCount: messages.length,
    toolNames: Object.keys(tools),
    systemPromptLen: system.length,
    callSettings: { maxRetries, temperature, maxTokens },
  });

  const t0 = Date.now();
  const modelMessages = await convertToModelMessages(messages);
  log.llm(`converted ${messages.length} UI messages → ${modelMessages.length} model messages (${Date.now() - t0}ms)`);

  const baseStreamConfig = {
    system,
    messages: modelMessages,
    tools,
    maxSteps: DEFAULT_MAX_STEPS,
    temperature,
    ...(maxTokens ? { maxTokens } : {}),
  };

  if (provider === "openai") {
    log.llm("using OpenAI: gpt-5.2-codex");
    const openaiProvider = apiKey ? createOpenAI({ apiKey }) : createOpenAI({});
    const result = streamText({
      ...baseStreamConfig,
      model: openaiProvider.responses("gpt-5.2-codex"),
      providerOptions: {
        openai: {
          reasoningEffort: "low",
        } satisfies OpenAIResponsesProviderOptions,
      },
      stopWhen: stepCountIs(DEFAULT_MAX_STEPS),
    });

    return { result, provider };
  }

  if (provider === "groq") {
    log.llm("using Groq: llama-3.3-70b-versatile");
    const groqApiKey = apiKey ?? process.env["GROQ_API_KEY"];
    const groqProvider = createOpenAI({
      apiKey: groqApiKey,
      baseURL: GROQ_BASE_URL,
    });
    const result = streamText({
      ...baseStreamConfig,
      model: groqProvider.chat("llama-3.3-70b-versatile"),
      stopWhen: stepCountIs(DEFAULT_MAX_STEPS),
    });

    return { result, provider };
  }

  if (provider === "nvidia") {
    log.llm("using NVIDIA provider, checking for API key…");
    const nvidiaApiKey = apiKey ?? process.env["NVIDIA_API_KEY"];
    const groqApiKey = apiKey ?? process.env["GROQ_API_KEY"];

    if (nvidiaApiKey) {
      log.llm("using NVIDIA: meta/llama-3.3-70b-instruct");
      const nvidiaProvider = createOpenAI({
        apiKey: nvidiaApiKey,
        baseURL: NVIDIA_BASE_URL,
      });
      const result = streamText({
        ...baseStreamConfig,
        model: nvidiaProvider.chat("meta/llama-3.3-70b-instruct"),
      });
      log.llm("streamText() called — streaming will begin");
      return { result, provider: "nvidia" as LlmProviderName };
    }

    if (groqApiKey) {
      log.llm("NVIDIA key not found, falling back to Groq: llama-3.3-70b-versatile");
      const groqProvider = createOpenAI({
        apiKey: groqApiKey,
        baseURL: GROQ_BASE_URL,
      });
      const result = streamText({
        ...baseStreamConfig,
        model: groqProvider.chat("llama-3.3-70b-versatile"),
      });
      log.llm("streamText() called — streaming will begin");
      return { result, provider: "groq" as LlmProviderName };
    }

    log.llmWarn("no NVIDIA or Groq API key found, falling back to Anthropic");
    const anthropicProvider = createAnthropic({});
    const result = streamText({
      ...baseStreamConfig,
      model: anthropicProvider("claude-sonnet-4-20250514"),
      stopWhen: stepCountIs(DEFAULT_MAX_STEPS),
    });
    return { result, provider: "anthropic" };
  }

  log.llm("using Anthropic: claude-sonnet-4-20250514");
  const anthropicProvider = apiKey ? createAnthropic({ apiKey }) : createAnthropic({});
  const result = streamText({
    ...baseStreamConfig,
    model: anthropicProvider("claude-sonnet-4-20250514"),
    stopWhen: stepCountIs(DEFAULT_MAX_STEPS),
  });

  return { result, provider };
};