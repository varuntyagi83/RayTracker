// ─── Asset Types ─────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  brandGuidelineId: string | null;
  brandGuidelineName?: string | null;
  createdAt: string;
  updatedAt: string;
}
