import { createAdminClient, ensureStorageBucket } from "@/lib/supabase/admin";
import { downloadImage } from "./decompose";
import type { CreativeOptions, BrandGuidelines, VariationStrategy } from "@/types/variations";
import {
  PRODUCT_ANGLE_LABELS,
  LIGHTING_STYLE_LABELS,
  BACKGROUND_STYLE_LABELS,
} from "@/types/variations";
import type { Asset } from "@/types/assets";

const STORAGE_BUCKET = "brand-assets";
const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ─── Strategy-Specific Visual Notes ─────────────────────────────────────────

const STRATEGY_VISUAL_NOTES: Record<VariationStrategy, string> = {
  hero_product:
    "Make the product the prominent focal point, centered with a clean professional look.",
  curiosity:
    "Create a visually intriguing composition with dramatic lighting or an unexpected angle.",
  pain_point:
    "Show a visual contrast or metaphor — the product should appear as a clear solution.",
  proof_point:
    "Give the image a premium, trustworthy, aspirational quality.",
  image_only:
    "Make this a stunning, eye-catching product photo with high production value.",
  text_only: "",
};

// ─── Build the image editing prompt ────────────────────────────────────────

export function buildGeminiEditPrompt(
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  creativeOptions?: CreativeOptions,
  brandGuidelines?: BrandGuidelines
): string {
  const directives: string[] = [];

  if (creativeOptions?.angle) {
    directives.push(
      `Adjust the product angle to a ${PRODUCT_ANGLE_LABELS[creativeOptions.angle].toLowerCase()} perspective.`
    );
  }

  if (creativeOptions?.lighting) {
    directives.push(
      `Change the lighting to ${LIGHTING_STYLE_LABELS[creativeOptions.lighting].toLowerCase()}.`
    );
  }

  if (creativeOptions?.background) {
    directives.push(
      `Change the background to ${BACKGROUND_STYLE_LABELS[creativeOptions.background].toLowerCase()}.`
    );
  }

  if (creativeOptions?.customInstruction) {
    directives.push(creativeOptions.customInstruction);
  }

  if (brandGuidelines?.colorPalette) {
    directives.push(
      `Use the brand color palette where appropriate: ${brandGuidelines.colorPalette}.`
    );
  }

  const strategyNote = STRATEGY_VISUAL_NOTES[strategy];
  if (strategyNote) {
    directives.push(strategyNote);
  }

  // Default enhancement when no creative options are selected
  if (directives.length === 0) {
    directives.push(
      "Enhance this product image for use as a social media advertisement. Improve the composition, lighting, and background to make it more visually appealing and professional."
    );
  }

  return [
    `Edit this product image of "${asset.name}" for a social media ad.`,
    asset.description ? `Product context: ${asset.description}.` : "",
    "",
    "A product mask is provided as the second image — WHITE areas are the product, BLACK areas are the background.",
    "",
    "Apply these changes ONLY to the BLACK (background) areas of the mask:",
    ...directives.map((d) => `- ${d}`),
    "",
    "CRITICAL RULES:",
    "- The WHITE areas in the mask are the product — do NOT modify those pixels at all.",
    "- Preserve the product EXACTLY as it appears — same shape, colors, label, packaging, and all text.",
    "- Do NOT re-render, regenerate, or alter any text on the product label or packaging.",
    "- Do NOT add any NEW text, words, letters, logos, or watermarks anywhere in the image.",
    "- Only transform the background/surroundings (BLACK mask areas) as directed above.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Generate product segmentation mask ─────────────────────────────────────

async function _generateProductMask(
  imageBuffer: Buffer,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  "Create a precise binary segmentation mask of the product in this image.",
                  "Rules:",
                  "- The product (including its label, cap, and any attached elements) must be PURE WHITE (#FFFFFF).",
                  "- Everything else (background, shadows, reflections, surface) must be PURE BLACK (#000000).",
                  "- The mask must have clean, precise edges around the product silhouette.",
                  "- Output ONLY the mask image with no text response.",
                ].join("\n"),
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini mask generation failed: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Empty response from Gemini mask generation");
  }

  const imagePart = parts.find(
    (p: { inlineData?: { mimeType?: string; data?: string } }) =>
      p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No mask image in Gemini response");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// ─── Extract image from Gemini response ─────────────────────────────────────

function _extractImageFromResponse(
  data: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> }
): Buffer {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Empty response from Gemini image editing");
  }

  const imagePart = parts.find(
    (p: { inlineData?: { mimeType?: string; data?: string } }) =>
      p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image in Gemini response");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// ─── Call Gemini for mask-protected image editing ────────────────────────────

export async function editAssetImageWithGemini(
  imageUrl: string,
  asset: Pick<Asset, "name" | "description">,
  strategy: VariationStrategy,
  workspaceId: string,
  variationId: string,
  creativeOptions?: CreativeOptions,
  brandGuidelines?: BrandGuidelines
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set — cannot use Gemini image editing");
  }

  // 1. Download the source asset image
  const imageBuffer = await downloadImage(imageUrl);

  // 2. Generate product segmentation mask (white = product, black = background)
  const maskBuffer = await _generateProductMask(imageBuffer, apiKey);

  // 3. Build the editing prompt (references the mask)
  const prompt = buildGeminiEditPrompt(asset, strategy, creativeOptions, brandGuidelines);

  // 4. Call Gemini with original image + mask (same two-image pattern as decompose.ts)
  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
                  data: imageBuffer.toString("base64"),
                },
              },
              {
                text: "Product mask (WHITE = product to preserve exactly, BLACK = background to modify):",
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
    if (errText.includes("not available in your country")) {
      throw new Error("Gemini image generation is not available in this region");
    }
    throw new Error(`Gemini API error: ${response.status} — ${errText}`);
  }

  // 5. Extract edited image from response
  const data = await response.json();
  const resultBuffer = _extractImageFromResponse(data);

  // 6. Upload to Supabase Storage
  await ensureStorageBucket();
  const storagePath = `${workspaceId}/variations/${variationId}-edited.png`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, resultBuffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return publicUrl;
}
