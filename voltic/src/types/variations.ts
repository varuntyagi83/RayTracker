// ─── Variation Types ─────────────────────────────────────────────────────────

export type VariationStrategy =
  | "hero_product"
  | "curiosity"
  | "pain_point"
  | "proof_point"
  | "image_only"
  | "text_only";

export const STRATEGY_LABELS: Record<VariationStrategy, string> = {
  hero_product: "Hero Product",
  curiosity: "Curiosity",
  pain_point: "Pain Point",
  proof_point: "Proof Point",
  image_only: "Image Only",
  text_only: "Text Only",
};

export const STRATEGY_DESCRIPTIONS: Record<VariationStrategy, string> = {
  hero_product: "Feature your product as the star, overlaid on the competitor ad style",
  curiosity: "Create intrigue with an open loop that makes viewers want to learn more",
  pain_point: "Address a specific customer pain point your product solves",
  proof_point: "Lead with social proof, results, or credibility signals",
  image_only: "Generate a new product image inspired by the ad creative style",
  text_only: "Generate only headline and body copy — no image generation",
};

export const VARIATION_CREDIT_COST = 10;

export interface VariationGenerationInput {
  savedAdId: string;
  assetId: string;
  strategies: VariationStrategy[];
}

export interface VariationTextResult {
  headline: string;
  body: string;
}

export interface Variation {
  id: string;
  savedAdId: string;
  assetId: string;
  strategy: VariationStrategy;
  generatedImageUrl: string | null;
  generatedHeadline: string | null;
  generatedBody: string | null;
  creditsUsed: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

// ─── Brand Guidelines Types ──────────────────────────────────────────────────

export interface BrandGuidelines {
  brandName?: string;
  brandVoice?: string;
  colorPalette?: string;
  targetAudience?: string;
  dosAndDonts?: string;
  files?: BrandGuidelineFile[];
}

export interface BrandGuidelineFile {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// ─── Creative Builder Types ──────────────────────────────────────────────────

export interface CreativeImage {
  id: string;
  url: string;
  name: string;
}

export interface CreativeText {
  id: string;
  headline: string;
  body: string;
}

export interface CreativeCombination {
  id: string;
  image: CreativeImage;
  text: CreativeText;
  enhancedHeadline?: string;
  enhancedBody?: string;
}

export const CREATIVE_ENHANCE_CREDIT_COST = 5;
