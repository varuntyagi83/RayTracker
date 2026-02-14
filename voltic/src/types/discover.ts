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
  country: string; // ISO 2-letter code or "ALL"
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

// ─── Ad Insight Types ──────────────────────────────────────────────────────

export interface AdInsightInput {
  brandName: string;
  headline: string;
  bodyText: string;
  format: string;
  platforms: string[];
  landingPageUrl: string | null;
  runtimeDays: number;
  isActive: boolean;
}

export interface AdInsightCopyStructure {
  headlineFormula: string;
  bodyFramework: string;
  ctaType: string;
}

export interface AdInsightTargetAudience {
  primary: string;
  interests: string[];
  painPoints: string[];
}

export interface AdInsightData {
  hookType: string;
  hookExplanation: string;
  copyStructure: AdInsightCopyStructure;
  creativeStrategy: string;
  targetAudience: AdInsightTargetAudience;
  strengths: string[];
  performanceScore: number;
  performanceRationale: string;
  improvements: string[];
}

export interface AdInsightRecord {
  id: string;
  workspaceId: string;
  metaLibraryId: string;
  brandName: string | null;
  headline: string | null;
  bodyText: string | null;
  format: string | null;
  insights: AdInsightData;
  model: string;
  creditsUsed: number;
  createdAt: string;
}
