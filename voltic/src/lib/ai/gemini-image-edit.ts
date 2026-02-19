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
    "Apply these changes to the image:",
    ...directives.map((d) => `- ${d}`),
    "",
    "CRITICAL RULES:",
    "- Preserve the product EXACTLY as it appears — same shape, colors, label, and packaging.",
    "- Do NOT modify, re-render, or regenerate any text that already exists on the product label or packaging. Leave all existing product text pixel-perfect and untouched.",
    "- Do NOT add any NEW text, words, letters, logos, watermarks, or typography anywhere in the image.",
    "- Only transform the SURROUNDINGS: angle, lighting, background, and composition as directed above.",
    "- The product label, brand name, and any printed text on the packaging must remain exactly as in the original image with correct spelling.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Call Gemini for image editing ─────────────────────────────────────────

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

  // 2. Build the editing prompt
  const prompt = buildGeminiEditPrompt(asset, strategy, creativeOptions, brandGuidelines);

  // 3. Call Gemini REST API (same pattern as decompose.ts _inpaintWithGemini)
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

  // 4. Extract image from response
  const data = await response.json();
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

  const resultBuffer = Buffer.from(imagePart.inlineData.data, "base64");

  // 5. Upload to Supabase Storage
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
