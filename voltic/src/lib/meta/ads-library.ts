/**
 * Meta Ads Library Scraper Service
 *
 * Fetches competitor ad data from the Meta Ads Library API.
 * In production, this would use the Meta Ads Library API (v21.0).
 * For now, it provides typed interfaces and a mock implementation.
 */

export interface AdsLibraryAd {
  id: string;
  pageId: string;
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
  platforms: ("facebook" | "instagram" | "audience_network" | "messenger")[];
  adsLibraryUrl: string;
}

export interface AdsLibraryScrapeParams {
  brandName: string;
  adsLibraryUrl?: string;
  topN: number;
  impressionPeriod: "last_7d" | "last_30d" | "last_90d" | "all_time";
  startedWithin: "last_7d" | "last_30d" | "last_90d" | "last_6m" | "last_1y";
}

export interface AdsLibraryScrapeResult {
  ads: AdsLibraryAd[];
  totalCount: number;
  scrapedAt: string;
  brandName: string;
}

/**
 * Scrape competitor ads from Meta Ads Library.
 *
 * TODO: Replace with real Meta Ads Library API integration in Phase 8+.
 * The real implementation will:
 * 1. Parse the adsLibraryUrl to extract page_id and search params
 * 2. Call GET /ads_archive with access_token, search_terms, ad_reached_countries
 * 3. Filter by impression_condition and ad_delivery_date_min
 * 4. Sort by impressions and return top N
 */
export async function scrapeAdsLibrary(
  params: AdsLibraryScrapeParams
): Promise<AdsLibraryScrapeResult> {
  // Mock implementation — returns sample data for UI development
  const mockAds: AdsLibraryAd[] = Array.from(
    { length: params.topN },
    (_, i) => ({
      id: `ad_${crypto.randomUUID().slice(0, 8)}`,
      pageId: `page_${params.brandName.toLowerCase().replace(/\s+/g, "_")}`,
      pageName: params.brandName,
      headline: MOCK_HEADLINES[i % MOCK_HEADLINES.length],
      bodyText: MOCK_BODY_TEXTS[i % MOCK_BODY_TEXTS.length],
      linkUrl: `https://example.com/${params.brandName.toLowerCase()}`,
      mediaType: MOCK_MEDIA_TYPES[i % MOCK_MEDIA_TYPES.length],
      mediaThumbnailUrl: null,
      startDate: getRandomStartDate(params.startedWithin),
      endDate: null,
      isActive: true,
      impressionRange: {
        lower: Math.floor(Math.random() * 50000) + 1000,
        upper: Math.floor(Math.random() * 100000) + 50000,
      },
      platforms: ["facebook", "instagram"],
      adsLibraryUrl: `https://www.facebook.com/ads/library/?id=${1000000 + i}`,
    })
  );

  return {
    ads: mockAds,
    totalCount: mockAds.length,
    scrapedAt: new Date().toISOString(),
    brandName: params.brandName,
  };
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_HEADLINES = [
  "Summer Collection — 50% Off Everything",
  "New Arrivals: Fresh Styles Just Dropped",
  "Free Shipping on Orders $50+",
  "Limited Time: Buy 2 Get 1 Free",
  "Shop the Look: Trending Now",
  "Flash Sale: 24 Hours Only",
  "Upgrade Your Wardrobe Today",
  "Exclusive Members-Only Deals",
  "Best Sellers Back in Stock",
  "Your New Favorite Just Arrived",
];

const MOCK_BODY_TEXTS = [
  "Discover our newest collection with styles for every occasion.",
  "Don't miss out on these incredible savings. Shop now before they're gone!",
  "Join millions of happy customers who trust us for quality and style.",
  "Premium quality meets affordable pricing. See why everyone's talking about us.",
  "Transform your look with our curated selection of trending pieces.",
];

const MOCK_MEDIA_TYPES: AdsLibraryAd["mediaType"][] = [
  "video",
  "image",
  "carousel",
  "video",
  "image",
];

function getRandomStartDate(startedWithin: AdsLibraryScrapeParams["startedWithin"]): string {
  const now = Date.now();
  const ranges: Record<typeof startedWithin, number> = {
    last_7d: 7 * 24 * 60 * 60 * 1000,
    last_30d: 30 * 24 * 60 * 60 * 1000,
    last_90d: 90 * 24 * 60 * 60 * 1000,
    last_6m: 180 * 24 * 60 * 60 * 1000,
    last_1y: 365 * 24 * 60 * 60 * 1000,
  };
  const offset = Math.floor(Math.random() * ranges[startedWithin]);
  return new Date(now - offset).toISOString().split("T")[0];
}
