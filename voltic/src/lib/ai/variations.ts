import { getOpenAIClient } from "./openai";
import { sanitizeForPrompt } from "@/lib/utils/prompt-sanitize";
import type {
  VariationStrategy,
  VariationTextResult,
  BrandGuidelines,
  CreativeOptions,
  AspectRatio,
} from "@/types/variations";
import {
  PRODUCT_ANGLE_LABELS,
  LIGHTING_STYLE_LABELS,
  BACKGROUND_STYLE_LABELS,
  ASPECT_RATIO_LABELS,
} from "@/types/variations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SavedAd } from "@/types/boards";
import type { Asset } from "@/types/assets";

// ─── Brand Guidelines Helper ────────────────────────────────────────────────

export function buildBrandGuidelinesSection(guidelines?: BrandGuidelines): string {
  if (!guidelines) return "";

  const parts: string[] = [];
  if (guidelines.brandName) parts.push(`Brand Name: ${sanitizeForPrompt(guidelines.brandName, 200)}`);
  if (guidelines.brandVoice) parts.push(`Brand Voice: ${sanitizeForPrompt(guidelines.brandVoice)}`);
  if (guidelines.colorPalette) parts.push(`Color Palette: ${sanitizeForPrompt(guidelines.colorPalette, 200)}`);
  if (guidelines.targetAudience) parts.push(`Target Audience: ${sanitizeForPrompt(guidelines.targetAudience)}`);
  if (guidelines.dosAndDonts) parts.push(`Guidelines: ${sanitizeForPrompt(guidelines.dosAndDonts)}`);

  if (parts.length === 0) return "";

  return [
    "",
    "--- BRAND GUIDELINES (must follow) ---",
    ...parts,
  ].join("\n");
}

// ─── Creative Options Helper ────────────────────────────────────────────────

export function buildCreativeOptionsSection(options?: CreativeOptions): string {
  if (!options) return "";

  const parts: string[] = [];
  if (options.angle) parts.push(`Product angle: ${PRODUCT_ANGLE_LABELS[options.angle]}`);
  if (options.lighting) parts.push(`Lighting: ${LIGHTING_STYLE_LABELS[options.lighting]}`);
  if (options.background) parts.push(`Background: ${BACKGROUND_STYLE_LABELS[options.background]}`);
  if (options.aspectRatio) parts.push(`Aspect ratio: ${ASPECT_RATIO_LABELS[options.aspectRatio]}`);
  if (options.customInstruction) {
    parts.push(`User creative note: ${sanitizeForPrompt(options.customInstruction, 200)}`);
  }

  if (parts.length === 0) return "";

  return [
    "",
    "--- CREATIVE DIRECTION ---",
    ...parts,
  ].join("\n");
}

// ─── Strategy Instructions (shared) ────────────────────────────────────────

const STRATEGY_INSTRUCTIONS: Record<VariationStrategy, string> = {
  hero_product:
    "Write copy that positions the product as the hero/star. Lead with the product name and its key benefit.",
  curiosity:
    "Write copy that creates an open loop — make the reader curious. Use intrigue, questions, or surprising facts.",
  pain_point:
    "Write copy that leads with a specific pain point the target audience feels, then position the product as the solution.",
  proof_point:
    "Write copy that leads with social proof, results, or authority. Use specific numbers or credibility signals.",
  image_only:
    "Write a short supporting headline and body for an image-first ad. Keep text minimal but impactful.",
  text_only:
    "Write a longer, more detailed headline and body since there's no image. The text must carry all the persuasive weight.",
};

const IMAGE_STYLE_NOTES: Record<VariationStrategy, string> = {
  hero_product:
    "The product should be prominently featured in the center, with a clean, professional background.",
  curiosity:
    "Create a visually intriguing image that makes the viewer want to learn more. Use dramatic lighting or an unexpected angle.",
  pain_point:
    "Show a before/after contrast or a visual metaphor for the problem the product solves.",
  proof_point:
    "Create a premium, trustworthy look — clean layout, the product displayed in an aspirational setting.",
  image_only:
    "Create a stunning, eye-catching product photo that works as a standalone ad image. High production value.",
  text_only: "",
};

// ─── Text Generation (GPT-4o) ───────────────────────────────────────────────

const TEXT_SYSTEM_PROMPT = `You are a world-class direct-response copywriter specializing in Meta (Facebook/Instagram) ad copy. You create scroll-stopping headlines and persuasive body copy.

Respond ONLY with valid JSON matching this schema:
{
  "headline": string,
  "body": string
}

Guidelines:
- headline: 5-12 words, punchy, attention-grabbing. Use the strategy provided.
- body: 2-4 sentences of compelling ad copy. Include a clear value proposition and CTA.
- Never use placeholder text or generic filler.
- If brand guidelines are provided, strictly follow the brand voice, tone, and rules.`;

const CHANNEL_INSTRUCTIONS: Record<string, string> = {
  facebook: "Write for Facebook feed — conversational, emoji-friendly, engagement-focused.",
  instagram: "Write for Instagram — visual-first, hashtag-ready, shorter punchy copy.",
  tiktok: "Write for TikTok — Gen-Z tone, trend-aware, ultra-short and punchy.",
  linkedin: "Write for LinkedIn — professional, thought-leadership tone, B2B-friendly.",
  google: "Write for Google Ads — keyword-focused, direct response, respect character limits.",
};

// ─── Competitor-Based Text Prompt ───────────────────────────────────────────

export function buildTextPrompt(
  ad: { brandName: string | null; headline: string | null; body: string | null; format: string },
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines,
  channel?: string
): string {
  const channelLine = channel && CHANNEL_INSTRUCTIONS[channel]
    ? `\n**Channel:** ${channel.toUpperCase()} — ${CHANNEL_INSTRUCTIONS[channel]}`
    : "";

  return [
    "Create ad copy for the following product, inspired by the competitor ad below.",
    "",
    `**Strategy:** ${strategy.replace(/_/g, " ").toUpperCase()} — ${STRATEGY_INSTRUCTIONS[strategy]}`,
    channelLine,
    "",
    "--- COMPETITOR AD (inspiration) ---",
    `Brand: ${sanitizeForPrompt(ad.brandName) || "Unknown"}`,
    `Headline: ${sanitizeForPrompt(ad.headline) || "(none)"}`,
    `Body: ${sanitizeForPrompt(ad.body) || "(none)"}`,
    `Format: ${ad.format}`,
    "",
    "--- YOUR PRODUCT ---",
    `Product: ${sanitizeForPrompt(asset.name, 200)}`,
    `Description: ${sanitizeForPrompt(asset.description) || "(no description)"}`,
    buildBrandGuidelinesSection(brandGuidelines),
    "",
    "Match the tone and style of the original ad but adapt it for the new product.",
    "Write the ad copy as JSON.",
  ].join("\n");
}

// ─── Asset-Based Text Prompt ────────────────────────────────────────────────

export function buildAssetTextPrompt(
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  creativeOptions?: CreativeOptions,
  brandGuidelines?: BrandGuidelines,
  channel?: string
): string {
  const channelLine = channel && CHANNEL_INSTRUCTIONS[channel]
    ? `\n**Channel:** ${channel.toUpperCase()} — ${CHANNEL_INSTRUCTIONS[channel]}`
    : "";

  return [
    "Create ad copy for the following product based on its details and creative direction.",
    "",
    `**Strategy:** ${strategy.replace(/_/g, " ").toUpperCase()} — ${STRATEGY_INSTRUCTIONS[strategy]}`,
    channelLine,
    "",
    "--- YOUR PRODUCT ---",
    `Product: ${sanitizeForPrompt(asset.name, 200)}`,
    `Description: ${sanitizeForPrompt(asset.description) || "(no description)"}`,
    buildCreativeOptionsSection(creativeOptions),
    buildBrandGuidelinesSection(brandGuidelines),
    "",
    "Write the ad copy as JSON.",
  ].join("\n");
}

// ─── Text Generation ────────────────────────────────────────────────────────

export async function generateVariationText(
  ad: Pick<SavedAd, "brandName" | "headline" | "body" | "format"> | null,
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines,
  channel?: string,
  creativeOptions?: CreativeOptions
): Promise<VariationTextResult> {
  const client = getOpenAIClient();

  const userPrompt = ad
    ? buildTextPrompt(ad, asset, strategy, brandGuidelines, channel)
    : buildAssetTextPrompt(asset, strategy, creativeOptions, brandGuidelines, channel);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: TEXT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  try {
    return JSON.parse(content) as VariationTextResult;
  } catch {
    throw new Error("AI returned malformed JSON — please retry");
  }
}

// ─── Competitor-Based Image Prompt ──────────────────────────────────────────

export function buildImagePrompt(
  ad: { brandName: string | null; format: string },
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines
): string {
  const brandStyle = brandGuidelines?.colorPalette
    ? ` Use the brand color palette: ${sanitizeForPrompt(brandGuidelines.colorPalette, 200)}.`
    : "";

  return [
    "CRITICAL: This image must contain ZERO text, ZERO letters, ZERO words, ZERO logos, ZERO watermarks, ZERO labels, ZERO brand names — purely visual, no typography of any kind.",
    `Create a professional Meta (Facebook/Instagram) ad image featuring a product: ${sanitizeForPrompt(asset.name, 200)}.`,
    asset.description ? `Product context: ${sanitizeForPrompt(asset.description)}` : "",
    `Inspired by the visual style of ${sanitizeForPrompt(ad.brandName, 100) || "a competitor"}'s ${ad.format} ad.`,
    IMAGE_STYLE_NOTES[strategy],
    `The image should be suitable for a social media ad — clean, modern, high-contrast, attention-grabbing.${brandStyle}`,
    "Remember: absolutely no text, letters, words, numbers, logos, labels, or watermarks anywhere in the image.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Asset-Based Image Prompt ───────────────────────────────────────────────

export function buildAssetImagePrompt(
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  creativeOptions?: CreativeOptions,
  brandGuidelines?: BrandGuidelines
): string {
  const angleLine = creativeOptions?.angle
    ? `Shoot from a ${PRODUCT_ANGLE_LABELS[creativeOptions.angle].toLowerCase()} perspective.`
    : "";
  const lightingLine = creativeOptions?.lighting
    ? `Use ${LIGHTING_STYLE_LABELS[creativeOptions.lighting].toLowerCase()} lighting.`
    : "";
  const backgroundLine = creativeOptions?.background
    ? `The background should be ${BACKGROUND_STYLE_LABELS[creativeOptions.background].toLowerCase()}.`
    : "";
  const customLine = creativeOptions?.customInstruction
    ? `Additional direction: ${sanitizeForPrompt(creativeOptions.customInstruction, 200)}`
    : "";
  const aspectLine = creativeOptions?.aspectRatio
    ? `The image should be composed for a ${ASPECT_RATIO_LABELS[creativeOptions.aspectRatio].toLowerCase()} format.`
    : "";

  const brandStyle = brandGuidelines?.colorPalette
    ? ` Use the brand color palette: ${sanitizeForPrompt(brandGuidelines.colorPalette, 200)}.`
    : "";

  return [
    "CRITICAL: This image must contain ZERO text, ZERO letters, ZERO words, ZERO logos, ZERO watermarks, ZERO labels, ZERO brand names — purely visual, no typography of any kind.",
    `Create a professional Meta (Facebook/Instagram) ad image featuring a product: ${sanitizeForPrompt(asset.name, 200)}.`,
    asset.description ? `Product context: ${sanitizeForPrompt(asset.description)}` : "",
    IMAGE_STYLE_NOTES[strategy],
    angleLine,
    lightingLine,
    backgroundLine,
    aspectLine,
    customLine,
    `The image should be suitable for a social media ad — clean, modern, high-contrast, attention-grabbing.${brandStyle}`,
    "Remember: absolutely no text, letters, words, numbers, logos, labels, or watermarks anywhere in the image.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Image Generation (Gemini) ───────────────────────────────────────────────

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const VARIATION_STORAGE_BUCKET = "brand-assets";

export async function generateVariationImage(
  ad: Pick<SavedAd, "brandName" | "format"> | null,
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  workspaceId: string,
  variationId: string,
  brandGuidelines?: BrandGuidelines,
  creativeOptions?: CreativeOptions
): Promise<string> {
  if (strategy === "text_only") {
    throw new Error("text_only strategy does not generate images");
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

  const prompt = ad
    ? buildImagePrompt(ad, asset, strategy, brandGuidelines)
    : buildAssetImagePrompt(asset, strategy, creativeOptions, brandGuidelines);

  const geminiUrl = `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body,
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Gemini image generation failed (${response.status}): ${err.slice(0, 200)}`);
  }

  const json = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("No image returned from Gemini");
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  const storagePath = `${workspaceId}/variations/${variationId}-gemini.png`;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(VARIATION_STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, { contentType: "image/png" });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(VARIATION_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrl;
}

// ─── Asset-Based Image Editing (Gemini Nano Banana Pro) ──────────────────

export async function generateAssetVariationImage(
  asset: Pick<Asset, "name" | "description" | "imageUrl">,
  strategy: VariationStrategy,
  workspaceId: string,
  variationId: string,
  creativeOptions?: CreativeOptions,
  brandGuidelines?: BrandGuidelines
): Promise<string> {
  if (strategy === "text_only") {
    throw new Error("text_only strategy does not generate images");
  }

  const { editAssetImageWithGemini } = await import("./gemini-image-edit");

  return editAssetImageWithGemini(
    asset.imageUrl,
    asset,
    strategy,
    workspaceId,
    variationId,
    creativeOptions,
    brandGuidelines
  );
}
