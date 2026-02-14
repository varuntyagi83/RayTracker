import { toFile } from "openai";
import sharp from "sharp";
import { getOpenAIClient } from "./openai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BoundingBox, DecompositionResult } from "@/types/decomposition";

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
      "confidence": 0.0 to 1.0,
      "bounding_box": {
        "x": 0 to 100,
        "y": 0 to 100,
        "width": 0 to 100,
        "height": 0 to 100
      }
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

Bounding box rules:
- bounding_box values are PERCENTAGES of the image dimensions (0 to 100)
- x = left edge of the text block as % from image left
- y = top edge of the text block as % from image top
- width = width of the text block as % of image width
- height = height of the text block as % of image height
- Be generous with bounding boxes — include some padding around the text (add ~2-3% padding on all sides)
- Every text entry MUST have a bounding_box

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

// ─── Mask Generation ────────────────────────────────────────────────────────

/**
 * Generates a PNG mask from bounding boxes. The mask is the same dimensions
 * as the source image with:
 * - Fully opaque black (#000000 alpha=255) everywhere EXCEPT
 * - Fully transparent (alpha=0) rectangles where the marketing text is
 *
 * OpenAI's images.edit() inpaints ONLY the transparent regions of the mask,
 * preserving everything else pixel-perfectly.
 */
async function generateMask(
  imageWidth: number,
  imageHeight: number,
  boxes: BoundingBox[]
): Promise<Buffer> {
  // Start with a fully opaque black image (all pixels preserved)
  let mask = sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  }).png();

  // Create transparent rectangles for each bounding box
  const overlays = boxes.map((box) => {
    const x = Math.max(0, Math.round((box.x / 100) * imageWidth));
    const y = Math.max(0, Math.round((box.y / 100) * imageHeight));
    const w = Math.min(
      imageWidth - x,
      Math.round((box.width / 100) * imageWidth)
    );
    const h = Math.min(
      imageHeight - y,
      Math.round((box.height / 100) * imageHeight)
    );

    // Create a transparent rectangle
    const rect = Buffer.alloc(w * h * 4, 0); // all zeros = fully transparent
    return { input: rect, raw: { width: w, height: h, channels: 4 as const }, left: x, top: y };
  });

  // Composite the transparent rectangles onto the black mask
  const maskBuffer = await mask
    .composite(overlays)
    .png()
    .toBuffer();

  return maskBuffer;
}

// ─── Clean Product Image Generation ─────────────────────────────────────────

const STORAGE_BUCKET = "brand-assets";

/**
 * Generates a clean product image by removing marketing overlay text.
 * Tries gpt-image-1 (mask-based inpainting) first, falls back to Gemini
 * (conversational editing) if OpenAI fails.
 *
 * Returns a permanent Supabase Storage URL.
 */
export async function generateCleanProductImage(
  imageUrl: string,
  marketingTexts: string[],
  boundingBoxes: BoundingBox[],
  workspaceId: string,
  decompositionId: string
): Promise<string> {
  // Shared: fetch image and prepare buffers
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch original image: ${imageResponse.status}`);
  }
  const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const pngBuffer = await sharp(originalBuffer).png().toBuffer();
  const metadata = await sharp(pngBuffer).metadata();
  const imgWidth = metadata.width ?? 1024;
  const imgHeight = metadata.height ?? 1024;
  const maskBuffer = await generateMask(imgWidth, imgHeight, boundingBoxes);

  const textList = marketingTexts.map((t) => `"${t}"`).join(", ");

  // Try Gemini 2.5 Flash Image first (better preservation of original)
  try {
    const resultBuffer = await _inpaintWithGemini(pngBuffer, maskBuffer, textList);
    return await _uploadCleanImage(resultBuffer, workspaceId, decompositionId);
  } catch (err) {
    console.error("[decompose] Gemini image editing failed, trying OpenAI fallback:", err);
  }

  // Fallback: gpt-image-1 mask-based inpainting
  const resultBuffer = await _inpaintWithOpenAI(pngBuffer, maskBuffer, textList);
  return await _uploadCleanImage(resultBuffer, workspaceId, decompositionId);
}

// ─── OpenAI gpt-image-1 (mask-based inpainting) ────────────────────────────

async function _inpaintWithOpenAI(
  pngBuffer: Buffer,
  maskBuffer: Buffer,
  textList: string
): Promise<Buffer> {
  const client = getOpenAIClient();

  const prompt = `Fill the masked areas seamlessly with the surrounding background. The masked areas previously contained marketing text: ${textList}. Match the background color, texture, and lighting exactly. Do NOT alter any unmasked areas.`;

  const imageFile = await toFile(pngBuffer, "original.png", { type: "image/png" });
  const maskFile = await toFile(maskBuffer, "mask.png", { type: "image/png" });

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    mask: maskFile,
    prompt,
    size: "1024x1024" as "1024x1024",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from gpt-image-1");
  }

  return Buffer.from(b64, "base64");
}

// ─── Gemini conversational image editing (fallback) ─────────────────────────

async function _inpaintWithGemini(
  pngBuffer: Buffer,
  maskBuffer: Buffer,
  textList: string
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set — cannot use Gemini fallback");
  }

  const prompt = `Edit this advertisement image to remove ONLY the marketing overlay text: ${textList}.

Fill the removed text areas seamlessly with the surrounding background color, texture, and lighting. The second image is a reference mask — the lighter/transparent rectangular areas show exactly where the marketing text is located.

CRITICAL: Do NOT alter the product, product packaging text, background, props, colors, or composition. ONLY remove the digitally-added marketing overlay text and fill with background.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: pngBuffer.toString("base64"),
                },
              },
              {
                text: "Reference mask (lighter areas = text to remove):",
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: maskBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    // Surface geo-restrictions clearly
    if (errText.includes("not available in your country")) {
      throw new Error("Gemini image generation is not available in this region");
    }
    throw new Error(`Gemini API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Empty response from Gemini image editing");
  }

  // Find the image part in the response
  const imagePart = parts.find(
    (p: { inlineData?: { mimeType?: string; data?: string } }) =>
      p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image in Gemini response");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// ─── Upload clean image to Supabase Storage ─────────────────────────────────

async function _uploadCleanImage(
  imageBuffer: Buffer,
  workspaceId: string,
  decompositionId: string
): Promise<string> {
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
