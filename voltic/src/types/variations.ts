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
  hero_product: "Feature your product as the star with a clean, professional look",
  curiosity: "Create intrigue with an open loop that makes viewers want to learn more",
  pain_point: "Address a specific customer pain point your product solves",
  proof_point: "Lead with social proof, results, or credibility signals",
  image_only: "Generate a new product image with high production value",
  text_only: "Generate only headline and body copy — no image generation",
};

export const VARIATION_CREDIT_COST = 10;

// ─── Variation Source ───────────────────────────────────────────────────────

export type VariationSource = "competitor" | "asset";

// ─── Aspect Ratio ─────────────────────────────────────────────────────────

export type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "3:4" | "4:3" | "5:4";

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "Square (1:1)",
  "9:16": "Portrait (9:16)",
  "16:9": "Landscape (16:9)",
  "4:5": "Portrait (4:5)",
  "3:4": "Portrait (3:4)",
  "4:3": "Landscape (4:3)",
  "5:4": "Landscape (5:4)",
};

// ─── Creative Options (for asset-based variations) ──────────────────────────

export type ProductAngle =
  | "front"
  | "side"
  | "top"
  | "back"
  | "three_quarter"
  | "close_up"
  | "flat_lay";

export type LightingStyle =
  | "natural"
  | "studio"
  | "dramatic"
  | "backlit"
  | "golden_hour"
  | "neon"
  | "soft_diffused";

export type BackgroundStyle =
  | "solid_white"
  | "solid_black"
  | "solid_color"
  | "gradient"
  | "lifestyle_scene"
  | "studio"
  | "outdoor"
  | "minimal"
  | "abstract";

export interface CreativeOptions {
  angle?: ProductAngle;
  lighting?: LightingStyle;
  background?: BackgroundStyle;
  customInstruction?: string;
  aspectRatio?: AspectRatio;
}

export const PRODUCT_ANGLE_LABELS: Record<ProductAngle, string> = {
  front: "Front View",
  side: "Side View",
  top: "Top Down",
  back: "Back View",
  three_quarter: "3/4 View",
  close_up: "Close Up",
  flat_lay: "Flat Lay",
};

export const LIGHTING_STYLE_LABELS: Record<LightingStyle, string> = {
  natural: "Natural Light",
  studio: "Studio Lighting",
  dramatic: "Dramatic",
  backlit: "Backlit",
  golden_hour: "Golden Hour",
  neon: "Neon Glow",
  soft_diffused: "Soft & Diffused",
};

export const BACKGROUND_STYLE_LABELS: Record<BackgroundStyle, string> = {
  solid_white: "Solid White",
  solid_black: "Solid Black",
  solid_color: "Solid Color",
  gradient: "Gradient",
  lifestyle_scene: "Lifestyle Scene",
  studio: "Studio",
  outdoor: "Outdoor",
  minimal: "Minimal",
  abstract: "Abstract",
};

// ─── Variation Input / Output ───────────────────────────────────────────────

export interface VariationGenerationInput {
  source: VariationSource;
  savedAdId?: string;
  assetId: string;
  strategies: VariationStrategy[];
  channel?: string;
  creativeOptions?: CreativeOptions;
}

export interface VariationTextResult {
  headline: string;
  body: string;
}

export interface Variation {
  id: string;
  savedAdId: string | null;
  assetId: string;
  source: VariationSource;
  strategy: VariationStrategy;
  creativeOptions: CreativeOptions | null;
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
