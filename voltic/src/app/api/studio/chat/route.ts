import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { getWorkspace } from "@/lib/supabase/queries";
import { aiLimiter } from "@/lib/utils/rate-limit";
import { createMessage, getMessages, resolveMentions, buildMentionContext } from "@/lib/data/studio";
import type { LLMProvider, MessageAttachment } from "@/types/creative-studio";
import { LLM_MODELS } from "@/types/creative-studio";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(10000),
  mentions: z
    .array(
      z.object({
        type: z.enum(["brand_guidelines", "asset", "competitor_report"]),
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
    )
    .default([]),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        type: z.string(),
        size: z.number(),
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

  // Rate limit
  const rl = aiLimiter.check(workspace.id, 20);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Validate input
  const parsed = chatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { conversationId, message, mentions, attachments, provider, model } = parsed.data;

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

  // Save user message with attachments
  await createMessage(workspace.id, {
    conversationId,
    role: "user",
    content: message,
    mentions,
    attachments: attachments as MessageAttachment[],
    creditsUsed: 0,
  });

  // Load conversation history for multi-turn context
  const previousMessages = await getMessages(workspace.id, conversationId);

  // Build messages array from conversation history
  // For user messages with images, include image parts for vision models
  const imageAttachments = attachments.filter((a) => a.type.startsWith("image/"));

  type UserContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: URL };

  const conversationMessages: Array<
    | { role: "user"; content: string | UserContentPart[] }
    | { role: "assistant"; content: string }
  > = previousMessages.map((msg, idx) => {
    if (msg.role === "assistant") {
      return { role: "assistant" as const, content: msg.content };
    }

    // User message — check for image attachments
    const isLatest = idx === previousMessages.length - 1;
    const msgAttachments = isLatest
      ? imageAttachments
      : ((msg.attachments ?? []) as MessageAttachment[]).filter((a) =>
          a.type.startsWith("image/")
        );

    if (msgAttachments.length > 0) {
      const parts: UserContentPart[] = [
        { type: "text", text: msg.content },
      ];
      for (const img of msgAttachments) {
        parts.push({ type: "image", image: new URL(img.url) });
      }
      return { role: "user" as const, content: parts };
    }

    return { role: "user" as const, content: msg.content };
  });

  // Build system prompt
  const systemParts: string[] = [
    "You are a creative advertising assistant for Voltic. You help create compelling ad copy, creative concepts, and marketing materials.",
    "When generating creatives, format your output clearly with sections like [Headline], [Body Copy], [Visual Direction], [CTA].",
    "Be specific, creative, and on-brand. Use the provided brand guidelines and asset context when available.",
    "When the user attaches images, analyze them carefully and use the visual details to inform your creative output.",
    "",
    "IMPORTANT — IMAGE GENERATION:",
    "When the user asks you to create, generate, or design an image, visual, ad creative, or any visual asset,",
    "you MUST include an [Image Prompt] section at the very end of your response.",
    "This section should contain a single, detailed image generation prompt (1-3 sentences) that describes the exact image to generate.",
    "Include: composition, subject, style, colors, lighting, mood, brand colors (if known), and any text overlays.",
    "Example:",
    "[Image Prompt]",
    "A premium product photograph of amber glass supplement bottles on a clean white marble surface, warm golden lighting from the left, scattered soft-gel capsules in the foreground, minimalist composition with generous negative space, brand colors #F5F1E8 and #8B7355 as accents, high-end commercial photography style.",
    "",
    "Only include [Image Prompt] when the user explicitly wants an image or visual generated. For text-only requests (copy, strategy, analysis), do NOT include it.",
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
