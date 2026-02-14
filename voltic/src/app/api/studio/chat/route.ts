import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { getWorkspace } from "@/lib/supabase/queries";
import { createMessage, getMessages, resolveMentions, buildMentionContext } from "@/lib/data/studio";
import type { LLMProvider } from "@/types/creative-studio";
import { LLM_MODELS } from "@/types/creative-studio";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(10000),
  mentions: z
    .array(
      z.object({
        type: z.enum(["brand_guidelines", "asset"]),
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
    )
    .default([]),
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate input
  const parsed = chatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { conversationId, message, mentions, provider, model } = parsed.data;

  // Find credit cost
  const modelConfig = LLM_MODELS.find(
    (m) => m.provider === provider && m.model === model
  );
  const creditCost = modelConfig?.creditCost ?? 3;

  // Resolve mentions
  let contextStr = "";
  if (mentions.length > 0) {
    const resolved = await resolveMentions(workspace.id, mentions);
    contextStr = buildMentionContext(resolved);
  }

  // Save user message
  await createMessage(workspace.id, {
    conversationId,
    role: "user",
    content: message,
    mentions,
    creditsUsed: 0,
  });

  // Load conversation history for multi-turn context
  const previousMessages = await getMessages(workspace.id, conversationId);

  // Build messages array from conversation history (exclude the just-saved user message
  // since it's the last one, and we already have it)
  const conversationMessages = previousMessages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Build system prompt
  const systemParts: string[] = [
    "You are a creative advertising assistant for Voltic. You help create compelling ad copy, creative concepts, and marketing materials.",
    "When generating creatives, format your output clearly with sections like [Headline], [Body Copy], [Visual Direction], [CTA].",
    "Be specific, creative, and on-brand. Use the provided brand guidelines and asset context when available.",
  ];

  if (contextStr) {
    systemParts.push(
      "\n\nThe user has referenced the following brand guidelines and assets. Use this context to inform your creative output:\n\n" +
        contextStr
    );
  }

  try {
    const aiModel = getModel(provider as LLMProvider, model);

    const result = streamText({
      model: aiModel,
      system: systemParts.join("\n"),
      messages: conversationMessages,
      async onFinish({ text }) {
        try {
          await createMessage(workspace.id, {
            conversationId,
            role: "assistant",
            content: text,
            creditsUsed: creditCost,
          });
        } catch (err) {
          console.error("Failed to save assistant message:", err);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Studio chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
