import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LLMProvider } from "@/types/creative-studio";

// ─── Lazy-initialized provider singletons ───────────────────────────────────

let _openai: ReturnType<typeof createOpenAI> | null = null;
let _anthropic: ReturnType<typeof createAnthropic> | null = null;
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getOpenAIProvider() {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
    _openai = createOpenAI({ apiKey });
  }
  return _openai;
}

function getAnthropicProvider() {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    _anthropic = createAnthropic({ apiKey });
  }
  return _anthropic;
}

function getGoogleProvider() {
  if (!_google) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey)
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
    _google = createGoogleGenerativeAI({ apiKey });
  }
  return _google;
}

// ─── Get Model ──────────────────────────────────────────────────────────────

export function getModel(provider: LLMProvider, modelId: string) {
  switch (provider) {
    case "openai":
      return getOpenAIProvider()(modelId);
    case "anthropic":
      return getAnthropicProvider()(modelId);
    case "google":
      return getGoogleProvider()(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
