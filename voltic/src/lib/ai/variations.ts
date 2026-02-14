import { getOpenAIClient } from "./openai";
import type { VariationStrategy, VariationTextResult, BrandGuidelines } from "@/types/variations";
import type { SavedAd } from "@/types/boards";
import type { Asset } from "@/types/assets";

// ─── Brand Guidelines Helper ────────────────────────────────────────────────

export function buildBrandGuidelinesSection(guidelines?: BrandGuidelines): string {
  if (!guidelines) return "";

  const parts: string[] = [];
  if (guidelines.brandName) parts.push(`Brand Name: ${guidelines.brandName}`);
  if (guidelines.brandVoice) parts.push(`Brand Voice: ${guidelines.brandVoice}`);
  if (guidelines.colorPalette) parts.push(`Color Palette: ${guidelines.colorPalette}`);
  if (guidelines.targetAudience) parts.push(`Target Audience: ${guidelines.targetAudience}`);
  if (guidelines.dosAndDonts) parts.push(`Guidelines: ${guidelines.dosAndDonts}`);

  if (parts.length === 0) return "";

  return [
    "",
    "--- BRAND GUIDELINES (must follow) ---",
    ...parts,
  ].join("\n");
}

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
- Match the tone and style of the original ad but adapt it for the new product.
- Never use placeholder text or generic filler.
- If brand guidelines are provided, strictly follow the brand voice, tone, and rules.`;

export function buildTextPrompt(
  ad: { brandName: string | null; headline: string | null; body: string | null; format: string },
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines
): string {
  const strategyInstructions: Record<VariationStrategy, string> = {
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

  return [
    "Create ad copy for the following product, inspired by the competitor ad below.",
    "",
    `**Strategy:** ${strategy.replace(/_/g, " ").toUpperCase()} — ${strategyInstructions[strategy]}`,
    "",
    "--- COMPETITOR AD (inspiration) ---",
    `Brand: ${ad.brandName ?? "Unknown"}`,
    `Headline: ${ad.headline ?? "(none)"}`,
    `Body: ${ad.body ?? "(none)"}`,
    `Format: ${ad.format}`,
    "",
    "--- YOUR PRODUCT ---",
    `Product: ${asset.name}`,
    `Description: ${asset.description ?? "(no description)"}`,
    buildBrandGuidelinesSection(brandGuidelines),
    "",
    "Write the ad copy as JSON.",
  ].join("\n");
}

export async function generateVariationText(
  ad: Pick<SavedAd, "brandName" | "headline" | "body" | "format">,
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines
): Promise<VariationTextResult> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: TEXT_SYSTEM_PROMPT },
      { role: "user", content: buildTextPrompt(ad, asset, strategy, brandGuidelines) },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content) as VariationTextResult;
}

// ─── Image Generation (DALL-E 3) ────────────────────────────────────────────

export function buildImagePrompt(
  ad: { brandName: string | null; format: string },
  asset: { name: string; description: string | null },
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines
): string {
  const styleNotes: Record<VariationStrategy, string> = {
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
    text_only:
      "", // text_only should never call image generation
  };

  const brandStyle = brandGuidelines?.colorPalette
    ? ` Use the brand color palette: ${brandGuidelines.colorPalette}.`
    : "";

  return [
    `Create a professional Meta (Facebook/Instagram) ad image for a product called "${asset.name}".`,
    asset.description ? `Product description: ${asset.description}` : "",
    `Inspired by the visual style of ${ad.brandName ?? "a competitor"}'s ${ad.format} ad.`,
    styleNotes[strategy],
    `The image should be suitable for a social media ad — clean, modern, high-contrast, attention-grabbing.${brandStyle}`,
    "Do NOT include any text, logos, or watermarks in the image.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateVariationImage(
  ad: Pick<SavedAd, "brandName" | "format">,
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  brandGuidelines?: BrandGuidelines
): Promise<string> {
  if (strategy === "text_only") {
    throw new Error("text_only strategy does not generate images");
  }

  const client = getOpenAIClient();

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: buildImagePrompt(ad, asset, strategy, brandGuidelines),
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const url = response.data?.[0]?.url;
  if (!url) throw new Error("No image URL returned from DALL-E");

  return url;
}
