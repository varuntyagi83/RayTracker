// ─── LLM Providers ──────────────────────────────────────────────────────────

export type LLMProvider = "openai" | "anthropic" | "google";

export interface LLMModelOption {
  provider: LLMProvider;
  model: string;
  label: string;
  description: string;
  supportsVision: boolean;
  creditCost: number;
}

export const LLM_MODELS: LLMModelOption[] = [
  {
    provider: "openai",
    model: "gpt-4o",
    label: "GPT-4o",
    description: "OpenAI flagship model",
    supportsVision: true,
    creditCost: 3,
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    description: "Anthropic balanced model",
    supportsVision: true,
    creditCost: 3,
  },
  {
    provider: "google",
    model: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Google fast model",
    supportsVision: true,
    creditCost: 2,
  },
];

// ─── Mentions ───────────────────────────────────────────────────────────────

export type MentionType = "brand_guidelines" | "asset";

export interface Mention {
  type: MentionType;
  id: string;
  name: string;
  slug: string;
}

// ─── Attachments ────────────────────────────────────────────────────────────

export interface MessageAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

// ─── Conversation ───────────────────────────────────────────────────────────

export interface StudioConversation {
  id: string;
  title: string;
  llmProvider: LLMProvider;
  llmModel: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

// ─── Message ────────────────────────────────────────────────────────────────

export interface StudioMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  mentions: Mention[];
  resolvedContext: Record<string, unknown> | null;
  attachments: MessageAttachment[];
  creditsUsed: number;
  createdAt: string;
}

// ─── Mentionable Item (for autocomplete) ────────────────────────────────────

export interface MentionableItem {
  id: string;
  type: MentionType;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}
