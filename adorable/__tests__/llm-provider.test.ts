import { describe, expect, it } from "vitest";
import { resolveProviderName } from "@/lib/llm-provider";

describe("resolveProviderName", () => {
  it("honors NVIDIA when explicitly selected", () => {
    expect(resolveProviderName("nvidia")).toBe("nvidia");
  });

  it("normalizes claude aliases to anthropic", () => {
    expect(resolveProviderName("claude")).toBe("anthropic");
  });

  it("defaults to openai for unknown providers", () => {
    expect(resolveProviderName("something-else")).toBe("openai");
  });
});
