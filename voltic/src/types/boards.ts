// ─── Board Types ─────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  description: string | null;
  adCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAd {
  id: string;
  boardId: string;
  source: string;
  metaLibraryId: string | null;
  brandName: string | null;
  headline: string | null;
  body: string | null;
  format: string;
  imageUrl: string | null;
  videoUrl: string | null;
  landingPageUrl: string | null;
  platforms: string[] | null;
  startDate: string | null;
  runtimeDays: number | null;
  createdAt: string;
}

export interface BoardWithAds extends Board {
  ads: SavedAd[];
}
