// ─── Discover Types ─────────────────────────────────────────────────────────

export interface DiscoverAd {
  id: string;
  pageName: string;
  headline: string;
  bodyText: string;
  linkUrl: string | null;
  mediaType: "image" | "video" | "carousel";
  mediaThumbnailUrl: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  impressionRange: { lower: number; upper: number } | null;
  platforms: string[];
  adsLibraryUrl: string;
  runtimeDays: number;
}

export interface DiscoverSearchParams {
  query: string;
  activeOnly: boolean;
  format: "all" | "image" | "video" | "carousel";
  sort: "newest" | "oldest" | "impressions";
  page: number;
  perPage: number;
}

export interface DiscoverSearchResult {
  ads: DiscoverAd[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface BoardOption {
  id: string;
  name: string;
}
