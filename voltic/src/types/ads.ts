// ─── Text Position Types ────────────────────────────────────────────────────

export type TextPositionType =
  | "center"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "custom";

export interface TextPosition {
  type: TextPositionType;
  x?: number;
  y?: number;
}

// ─── Ad Compositing Config ──────────────────────────────────────────────────

export interface AdCompositingConfig {
  backgroundImageUrl: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
}

// ─── Ad Preview Combination ────────────────────────────────────────────────

export interface AdPreviewCombination {
  id: string;
  backgroundAssetId: string;
  backgroundImageUrl: string;
  backgroundAssetName: string;
  textVariant: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
  previewImageUrl?: string;
  storagePath?: string;
  width?: number;
  height?: number;
  status: "pending" | "approved" | "rejected";
}

// ─── Generated Ad (DB entity) ──────────────────────────────────────────────

export interface GeneratedAd {
  id: string;
  workspaceId: string;
  brandGuidelineId: string;
  brandGuidelineName?: string;
  backgroundAssetId: string;
  backgroundAssetName?: string;
  textVariant: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
  imageUrl: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Font Options ───────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Impact", label: "Impact" },
  { value: "Courier New", label: "Courier New" },
  { value: "Palatino", label: "Palatino" },
  { value: "Garamond", label: "Garamond" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
  { value: "Lucida Sans", label: "Lucida Sans" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Futura", label: "Futura" },
  { value: "Gill Sans", label: "Gill Sans" },
  { value: "Rockwell", label: "Rockwell" },
  { value: "Oswald", label: "Oswald" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
] as const;

// ─── Text Position Options ──────────────────────────────────────────────────

export const TEXT_POSITION_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top Center" },
  { value: "bottom", label: "Bottom Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "custom", label: "Custom (X, Y)" },
] as const;
