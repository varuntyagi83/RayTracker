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
  scrapeCount: number; // how many ads to fetch from Apify (10/25/50)
}

export interface DiscoverSearchResult {
  ads: DiscoverAd[];
  totalCount: number;
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

// ─── Ad Comparison Types ──────────────────────────────────────────────────

export interface ComparisonAdInput {
  id: string;
  pageName: string;
  headline: string;
  bodyText: string;
  mediaType: "image" | "video" | "carousel";
  platforms: string[];
  linkUrl: string | null;
  runtimeDays: number;
  isActive: boolean;
  mediaThumbnailUrl: string | null;
}

export interface ComparisonAdAnalysis {
  brandName: string;
  hookType: string;
  copyFramework: string;
  creativeStrategy: string;
  targetAudience: string;
  strengths: string[];
  weaknesses: string[];
  performanceScore: number;
}

export interface ComparisonResult {
  ads: ComparisonAdAnalysis[];
  winner: {
    brandName: string;
    adId: string;
    rationale: string;
  };
  comparativeInsights: {
    hookComparison: string;
    copyComparison: string;
    audienceOverlap: string;
    creativeStrategyComparison: string;
  };
  recommendations: string[];
  summary: string;
}

export interface AdComparisonRecord {
  id: string;
  workspaceId: string;
  adIds: string[];
  brandNames: string[];
  result: ComparisonResult;
  model: string;
  creditsUsed: number;
  createdAt: string;
}
