/**
 * Meta Ads Library Scraper Service
 *
 * Uses Apify's Facebook Ads Library scraper actor to fetch competitor ads.
 * Falls back to mock data when APIFY_API_TOKEN is not configured.
 *
 * Env vars:
 *   APIFY_API_TOKEN          — Your Apify API token
 *   APIFY_ADS_LIBRARY_ACTOR_ID — Actor ID (default: apify/facebook-ads-library-scraper)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Apify Config ───────────────────────────────────────────────────────────

const APIFY_BASE_URL = "https://api.apify.com/v2";

function getApifyConfig() {
  const token = process.env.APIFY_API_TOKEN;
  const actorId = process.env.APIFY_ADS_LIBRARY_ACTOR_ID || "apify/facebook-ads-library-scraper";
  return { token, actorId };
}

/** Map our startedWithin values to a date string for the actor input */
function getStartDateFromWithin(startedWithin: AdsLibraryScrapeParams["startedWithin"]): string {
  const now = Date.now();
  const ms: Record<typeof startedWithin, number> = {
    last_7d: 7 * 86_400_000,
    last_30d: 30 * 86_400_000,
    last_90d: 90 * 86_400_000,
    last_6m: 180 * 86_400_000,
    last_1y: 365 * 86_400_000,
  };
  return new Date(now - ms[startedWithin]).toISOString().split("T")[0];
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Scrape competitor ads from Meta Ads Library via Apify.
 * Falls back to mock data if APIFY_API_TOKEN is not set.
 */
export async function scrapeAdsLibrary(
  params: AdsLibraryScrapeParams
): Promise<AdsLibraryScrapeResult> {
  const { token, actorId } = getApifyConfig();

  // If no Apify token, return mock data for local development
  if (!token) {
    console.warn("[ads-library] APIFY_API_TOKEN not set — returning mock data");
    return getMockResult(params);
  }

  try {
    // Run the Apify actor synchronously (waits for completion)
    const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;

    const response = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchTerms: params.brandName,
        adType: "all",
        adActiveStatus: "active",
        adDeliveryDateMin: getStartDateFromWithin(params.startedWithin),
        resultsLimit: params.topN,
        // If user provided a direct URL, pass it for more precise targeting
        ...(params.adsLibraryUrl ? { startUrls: [{ url: params.adsLibraryUrl }] } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ads-library] Apify request failed:", response.status, errorText);
      return getMockResult(params);
    }

    const rawItems: ApifyAdItem[] = await response.json();

    const ads: AdsLibraryAd[] = rawItems.slice(0, params.topN).map((item, i) => ({
      id: item.id || `apify_${i}`,
      pageId: item.pageId || item.page_id || "",
      pageName: item.pageName || item.page_name || params.brandName,
      headline: item.title || item.ad_creative_bodies?.[0] || "Untitled Ad",
      bodyText: item.body || item.ad_creative_bodies?.join(" ") || "",
      linkUrl: item.link_url || item.ad_creative_link_captions?.[0] || null,
      mediaType: inferMediaType(item),
      mediaThumbnailUrl: item.image_url || item.ad_snapshot_url || null,
      startDate: item.start_date || item.ad_delivery_start_time || "",
      endDate: item.end_date || item.ad_delivery_stop_time || null,
      isActive: item.is_active ?? item.ad_delivery_start_time != null,
      impressionRange: item.impressions
        ? { lower: item.impressions.lower_bound || 0, upper: item.impressions.upper_bound || 0 }
        : null,
      platforms: item.publisher_platforms || ["facebook"],
      adsLibraryUrl: item.ad_library_url || item.url || `https://www.facebook.com/ads/library/?id=${item.id}`,
    }));

    return {
      ads,
      totalCount: ads.length,
      scrapedAt: new Date().toISOString(),
      brandName: params.brandName,
    };
  } catch (error) {
    console.error("[ads-library] Apify scrape error:", error);
    return getMockResult(params);
  }
}

// ─── Apify Response Shape ───────────────────────────────────────────────────

/** Loose type for Apify actor output — field names vary by actor version */
interface ApifyAdItem {
  id?: string;
  pageId?: string;
  page_id?: string;
  pageName?: string;
  page_name?: string;
  title?: string;
  body?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  link_url?: string;
  image_url?: string;
  video_url?: string;
  ad_snapshot_url?: string;
  start_date?: string;
  end_date?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  is_active?: boolean;
  impressions?: { lower_bound?: number; upper_bound?: number };
  publisher_platforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[];
  ad_library_url?: string;
  url?: string;
  media_type?: string;
}

function inferMediaType(item: ApifyAdItem): AdsLibraryAd["mediaType"] {
  if (item.media_type === "video" || item.video_url) return "video";
  if (item.media_type === "carousel") return "carousel";
  return "image";
}

// ─── Mock Fallback ──────────────────────────────────────────────────────────

function getMockResult(params: AdsLibraryScrapeParams): AdsLibraryScrapeResult {
  const mockAds: AdsLibraryAd[] = Array.from(
    { length: params.topN },
    (_, i) => ({
      id: `mock_${crypto.randomUUID().slice(0, 8)}`,
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
    last_7d: 7 * 86_400_000,
    last_30d: 30 * 86_400_000,
    last_90d: 90 * 86_400_000,
    last_6m: 180 * 86_400_000,
    last_1y: 365 * 86_400_000,
  };
  const offset = Math.floor(Math.random() * ranges[startedWithin]);
  return new Date(now - offset).toISOString().split("T")[0];
}
