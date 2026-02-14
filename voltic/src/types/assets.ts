// ─── Asset Types ─────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}
