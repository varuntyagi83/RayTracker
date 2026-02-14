// ─── Color Swatch ───────────────────────────────────────────────────────────

export interface ColorSwatch {
  hex: string;
  name: string;
}

// ─── Typography ─────────────────────────────────────────────────────────────

export interface Typography {
  headingFont?: string;
  bodyFont?: string;
  sizes?: Record<string, string>;
}

// ─── Brand Guideline File ───────────────────────────────────────────────────

export interface BrandGuidelineFile {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// ─── Brand Guideline Entity (DB Row) ────────────────────────────────────────

export interface BrandGuidelineEntity {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  brandName: string | null;
  brandVoice: string | null;
  colorPalette: ColorSwatch[];
  typography: Typography;
  targetAudience: string | null;
  dosAndDonts: string | null;
  logoUrl: string | null;
  files: BrandGuidelineFile[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Create / Update Input ──────────────────────────────────────────────────

export interface BrandGuidelineInput {
  name: string;
  brandName?: string;
  brandVoice?: string;
  colorPalette?: ColorSwatch[];
  typography?: Typography;
  targetAudience?: string;
  dosAndDonts?: string;
  isDefault?: boolean;
}

// ─── AI-Generated Brand Guidelines ──────────────────────────────────────────

export interface GeneratedBrandGuidelines {
  brandName: string;
  brandVoice: string;
  colorPalette: ColorSwatch[];
  typography: Typography;
  targetAudience: string;
  dosAndDonts: string;
}

// ─── Credit Cost ────────────────────────────────────────────────────────────

export const BRAND_GUIDELINES_AI_CREDIT_COST = 5;
