import { getOpenAIClient } from "./openai";
import type { DecompositionResult } from "@/types/decomposition";

// ─── System Prompt ───────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are an expert ad creative analyst. Analyze this advertisement image and extract structured data about its composition.

CRITICAL DISTINCTION — You must separate two categories of text:
1. **Marketing/overlay text** — text digitally composited onto the ad (headlines, taglines, descriptions, CTAs, legal disclaimers). This text is NOT physically on the product.
2. **Product/packaging text** — text physically printed on the product packaging itself (brand name, product name, variant name, ingredients, certifications, weight/volume).

If the SAME text appears as both a marketing overlay AND on the product packaging, create TWO separate entries — one as marketing type and one as "brand" type.

Return ONLY valid JSON matching this exact schema:
{
  "texts": [
    {
      "content": "exact text as written",
      "type": "headline" | "subheadline" | "body" | "cta" | "legal" | "brand",
      "position": "top" | "center" | "bottom" | "overlay",
      "estimated_font_size": "large" | "medium" | "small",
      "confidence": 0.0 to 1.0
    }
  ],
  "product": {
    "detected": true/false,
    "description": "description of the product shown",
    "position": "left" | "center" | "right" | "full",
    "occupies_percent": 0 to 100
  },
  "background": {
    "type": "solid_color" | "gradient" | "photo" | "pattern" | "transparent",
    "dominant_colors": ["#hex1", "#hex2"],
    "description": "brief description of the background"
  },
  "layout": {
    "style": "product_hero" | "lifestyle" | "text_heavy" | "minimal" | "split" | "collage",
    "text_overlay_on_image": true/false,
    "brand_elements": ["Logo top-left", "Tagline bottom", etc.]
  }
}

Type classification rules:
- "headline" / "subheadline" / "body" / "cta" / "legal" → ONLY for marketing overlay text (digitally added to the ad)
- "brand" → ONLY for text physically printed on the product packaging

Other rules:
- Capture EVERY piece of visible text exactly as written — even tiny text on product labels
- For product detection, describe what you see without assuming brand names unless clearly visible
- Be precise about text positions relative to the image
- Confidence should reflect how certain you are about the text extraction (OCR quality)
- Lower confidence for small or partially obscured packaging text
- dominant_colors should be valid hex color codes
- brand_elements should list all branding elements with their approximate position`;

// ─── Decompose Ad Image ──────────────────────────────────────────────────────

export async function decomposeAdImage(
  imageUrl: string
): Promise<DecompositionResult> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
          {
            type: "text",
            text: "Analyze this advertisement image. Extract all text, identify the product, describe the background, and classify the layout. Return the structured JSON response.",
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from GPT-4o Vision");
  }

  const parsed = JSON.parse(content) as DecompositionResult;

  // Validate required fields exist
  if (!parsed.texts || !parsed.product || !parsed.background || !parsed.layout) {
    throw new Error("Incomplete decomposition result from GPT-4o Vision");
  }

  return parsed;
}

// ─── Generate Clean Image (text-removed version) ────────────────────────────

export async function generateCleanImage(
  imageUrl: string,
  productDescription: string
): Promise<string> {
  const client = getOpenAIClient();

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: `Recreate this product advertisement image but remove ALL text overlays, logos, and branding elements. Keep ONLY the product (${productDescription}) and the background. The product should remain in the exact same position and style. No text, no logos, no watermarks — just the clean product shot.`,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const url = response.data?.[0]?.url;
  if (!url) {
    throw new Error("No image URL returned from DALL-E for clean image generation");
  }

  return url;
}
