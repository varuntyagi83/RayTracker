import { toFile } from "openai";
import sharp from "sharp";
import { getOpenAIClient } from "./openai";
import { createAdminClient } from "@/lib/supabase/admin";
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

// ─── Generate Clean Product Image (inpainting via gpt-image-1) ──────────────

const STORAGE_BUCKET = "brand-assets";

/**
 * Uses gpt-image-1 to inpaint the original ad image, removing ONLY the
 * digitally composited marketing overlay text while preserving the product
 * (including packaging text), background, and all other elements.
 *
 * Returns a permanent Supabase Storage URL (not a temporary OpenAI URL).
 */
export async function generateCleanProductImage(
  imageUrl: string,
  marketingTexts: string[],
  workspaceId: string,
  decompositionId: string
): Promise<string> {
  const client = getOpenAIClient();

  // 1. Fetch original image and convert to PNG buffer
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch original image: ${imageResponse.status}`);
  }
  const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const pngBuffer = await sharp(originalBuffer).png().toBuffer();

  // 2. Build prompt listing the specific texts to remove
  const textList = marketingTexts
    .map((t) => `"${t}"`)
    .join(", ");

  const prompt = `Edit this advertisement image: remove ONLY the following digitally composited marketing overlay text: ${textList}. Fill the removed text areas seamlessly with the surrounding background. Keep the product with ALL its packaging text, the background, props, and styling EXACTLY as they are. Do NOT change, move, or alter the product, its packaging, or any other visual element.`;

  // 3. Call gpt-image-1 images.edit() for inpainting
  const file = await toFile(pngBuffer, "original.png", { type: "image/png" });

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt,
    size: "1024x1024" as "1024x1024",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from gpt-image-1 for clean product image");
  }

  // 4. Upload to Supabase Storage for a permanent URL
  const imageBuffer = Buffer.from(b64, "base64");
  const storagePath = `${workspaceId}/decompose/${decompositionId}-clean.png`;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return publicUrl;
}
