// ─── Decomposition Types ──────────────────────────────────────────────────

export type TextType =
  | "headline"
  | "subheadline"
  | "body"
  | "cta"
  | "legal"
  | "brand";

export type TextPosition = "top" | "center" | "bottom" | "overlay";
export type FontSize = "large" | "medium" | "small";
export type ProductPosition = "left" | "center" | "right" | "full";
export type BackgroundType =
  | "solid_color"
  | "gradient"
  | "photo"
  | "pattern"
  | "transparent";
export type LayoutStyle =
  | "product_hero"
  | "lifestyle"
  | "text_heavy"
  | "minimal"
  | "split"
  | "collage";

export type SourceType = "saved_ad" | "discover" | "upload";
export type ProcessingStatus = "pending" | "analyzing" | "completed" | "failed";

// ─── GPT-4o Vision Response Schema ───────────────────────────────────────

export interface ExtractedText {
  content: string;
  type: TextType;
  position: TextPosition;
  estimated_font_size: FontSize;
  confidence: number;
}

export interface ProductAnalysis {
  detected: boolean;
  description: string;
  position: ProductPosition;
  occupies_percent: number;
}

export interface BackgroundAnalysis {
  type: BackgroundType;
  dominant_colors: string[];
  description: string;
}

export interface LayoutAnalysis {
  style: LayoutStyle;
  text_overlay_on_image: boolean;
  brand_elements: string[];
}

export interface DecompositionResult {
  texts: ExtractedText[];
  product: ProductAnalysis;
  background: BackgroundAnalysis;
  layout: LayoutAnalysis;
}

// ─── Full Record (DB + API response) ─────────────────────────────────────

export interface AdDecomposition {
  id: string;
  workspaceId: string;
  sourceImageUrl: string;
  sourceType: SourceType;
  sourceId: string | null;
  extractedTexts: ExtractedText[];
  productAnalysis: ProductAnalysis;
  backgroundAnalysis: BackgroundAnalysis;
  layoutAnalysis: LayoutAnalysis;
  cleanImageUrl: string | null;
  processingStatus: ProcessingStatus;
  creditsUsed: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Input Types ─────────────────────────────────────────────────────

export interface DecomposeInput {
  image_url: string;
  source_type: SourceType;
  source_id?: string;
  generate_clean_image?: boolean;
}

export interface DecomposeBatchInput {
  image_urls: string[];
  source_type: SourceType;
  generate_clean_images?: boolean;
}

// ─── Credit Constants ────────────────────────────────────────────────────

export const DECOMPOSITION_ANALYSIS_COST = 5;
export const DECOMPOSITION_CLEAN_IMAGE_COST = 5;
export const DECOMPOSITION_BATCH_MAX = 20;
