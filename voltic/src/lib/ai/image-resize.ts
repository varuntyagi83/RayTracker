import sharp from "sharp";
import type { AspectRatio } from "@/types/variations";

// ─── Target Dimensions (longer edge = 1024px) ──────────────────────────────

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1":  { width: 1024, height: 1024 },
  "9:16": { width: 576,  height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "4:5":  { width: 820,  height: 1024 },
  "3:4":  { width: 768,  height: 1024 },
  "4:3":  { width: 1024, height: 768 },
  "5:4":  { width: 1024, height: 820 },
};

// ─── DALL-E 3 Size Mapping ──────────────────────────────────────────────────

type DalleSize = "1024x1024" | "1024x1792" | "1792x1024";

const DALLE_SIZE_MAP: Record<AspectRatio, DalleSize> = {
  "1:1":  "1024x1024",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "4:5":  "1024x1792",
  "3:4":  "1024x1792",
  "4:3":  "1792x1024",
  "5:4":  "1024x1024",
};

/**
 * Maps an AspectRatio to the closest DALL-E 3 supported size.
 * Returns "1024x1024" when no aspect ratio is specified.
 */
export function getDalleSize(aspectRatio?: AspectRatio): DalleSize {
  if (!aspectRatio) return "1024x1024";
  return DALLE_SIZE_MAP[aspectRatio];
}

// ─── Sharp Resize / Crop ────────────────────────────────────────────────────

/**
 * Resizes and smart-crops an image buffer to the target aspect ratio.
 * Uses sharp's entropy-based "attention" strategy to keep the most
 * visually important region.
 */
export async function resizeToAspectRatio(
  imageBuffer: Buffer,
  aspectRatio: AspectRatio
): Promise<Buffer> {
  const { width, height } = ASPECT_RATIO_DIMENSIONS[aspectRatio];

  return sharp(imageBuffer)
    .resize(width, height, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .png()
    .toBuffer();
}
