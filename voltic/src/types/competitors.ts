// ─── Competitor Ad ─────────────────────────────────────────────────────────

export interface CompetitorAd {
  id: string;
  competitorBrandId: string;
  workspaceId: string;
  metaLibraryId: string;
  headline: string | null;
  bodyText: string | null;
  format: string;
  mediaType: string;
  imageUrl: string | null;
  videoUrl: string | null;
  landingPageUrl: string | null;
  platforms: string[];
  startDate: string | null;
  runtimeDays: number | null;
  isActive: boolean;
  adsLibraryUrl: string | null;
  scrapedAt: string;
  createdAt: string;
}

// ─── Competitor Brand (with ad count) ─────────────────────────────────────

export interface CompetitorBrand {
  id: string;
  workspaceId: string;
  name: string;
  metaAdsLibraryUrl: string | null;
  description: string | null;
  lastScrapedAt: string | null;
  adCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Per-Ad Analysis ──────────────────────────────────────────────────────

export interface CompetitorAdAnalysis {
  adId: string;
  metaLibraryId: string;
  brandName: string;
  headline: string;
  bodyText: string;
  format: string;

  // Hook analysis
  hookType: string;
  hookExplanation: string;

  // CTA analysis
  ctaType: string;
  ctaAnalysis: string;

  // Target audience
  targetAudience: {
    primary: string;
    interests: string[];
    painPoints: string[];
  };

  // Body/copy analysis
  copyStructure: {
    framework: string;
    structure: string;
    headlineFormula: string;
  };

  // Strengths & weaknesses
  strengths: string[];
  weaknesses: string[];
  improvements: string[];

  // Estimates
  estimatedClicksRange: { low: number; high: number };
  estimatedROAS: { low: number; high: number };
  estimatedTargetGroup: string;

  // Score
  performanceScore: number;
  performanceRationale: string;
}

// ─── Cross-Brand Summary ──────────────────────────────────────────────────

export interface CrossBrandSummary {
  commonPatterns: string[];
  bestPractices: string[];
  gapsAndOpportunities: string[];
  marketPositioning: string;
  overallRecommendations: string[];
}

// ─── Full Report ──────────────────────────────────────────────────────────

export interface CompetitorReport {
  id: string;
  workspaceId: string;
  title: string;
  competitorBrandIds: string[];
  competitorBrandNames: string[];
  adCount: number;
  perAdAnalyses: CompetitorAdAnalysis[];
  crossBrandSummary: CrossBrandSummary;
  model: string;
  creditsUsed: number;
  createdAt: string;
}
