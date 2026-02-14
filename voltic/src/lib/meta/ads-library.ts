/**
 * Meta Ads Library Scraper Service
 *
 * Uses curious_coder/facebook-ads-library-scraper on Apify.
 * Supports native `count` param — fetches exactly N ads, finishes in ~15-20s.
 * Falls back to mock data when APIFY_API_TOKEN is not configured.
 *
 * Env vars:
 *   APIFY_API_TOKEN — Your Apify API token
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
const ACTOR_ID = "curious_coder~facebook-ads-library-scraper";
const MAX_ITEMS = 10;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_TIME_MS = 2 * 60 * 1_000; // 2 minutes max (actor usually finishes in ~17s)

// ─── In-memory cache (brand → result, 10 min TTL) ──────────────────────────

const cache = new Map<string, { result: AdsLibraryScrapeResult; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1_000;

function getCached(key: string): AdsLibraryScrapeResult | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.result;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, result: AdsLibraryScrapeResult) {
  cache.set(key, { result, ts: Date.now() });
}

// ─── Main Function ──────────────────────────────────────────────────────────

export async function scrapeAdsLibrary(
  params: AdsLibraryScrapeParams
): Promise<AdsLibraryScrapeResult> {
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    console.warn("[ads-library] APIFY_API_TOKEN not set — returning mock data");
    return getMockResult(params);
  }

  // Check cache first
  const cacheKey = params.brandName.toLowerCase().trim();
  const cached = getCached(cacheKey);
  if (cached) {
    console.log("[ads-library] Cache hit for:", cacheKey);
    return cached;
  }

  try {
    const searchUrl = buildAdsLibraryUrl(params.brandName);

    // 1. Start actor run (async)
    console.log("[ads-library] Starting Apify run for:", params.brandName);
    const startUrl = `${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?token=${token}`;
    const startRes = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [{ url: searchUrl }],
        count: Math.min(params.topN, MAX_ITEMS),
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error("[ads-library] Failed to start run:", startRes.status, errText);
      return getMockResult(params);
    }

    const runData = await startRes.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;
    if (!runId || !datasetId) {
      console.error("[ads-library] No run ID or dataset ID returned");
      return getMockResult(params);
    }

    console.log("[ads-library] Run started:", runId);

    // 2. Poll for completion (usually ~17 seconds)
    const rawItems = await pollForItems(token, runId, datasetId);
    if (!rawItems || rawItems.length === 0) {
      console.error("[ads-library] No items scraped");
      return getMockResult(params);
    }

    console.log("[ads-library] Got", rawItems.length, "items from Apify");

    const ads = mapCuriousCoderItems(rawItems, params);
    const result: AdsLibraryScrapeResult = {
      ads,
      totalCount: ads.length,
      scrapedAt: new Date().toISOString(),
      brandName: params.brandName,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[ads-library] Apify scrape error:", error);
    return getMockResult(params);
  }
}

// ─── Polling ────────────────────────────────────────────────────────────────

async function pollForItems(
  token: string,
  runId: string,
  datasetId: string
): Promise<CuriousCoderAdItem[] | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

    const statusUrl = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`;
    const statusRes = await fetch(statusUrl);
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log(`[ads-library] Poll: status=${status}, elapsed=${elapsed}s`);

    if (status === "SUCCEEDED") {
      console.log(`[ads-library] Run succeeded in ${elapsed}s`);
      return await fetchDatasetItems(token, datasetId);
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      console.error("[ads-library] Run ended with status:", status);
      // Still try to grab partial results
      const items = await fetchDatasetItems(token, datasetId);
      return items.length > 0 ? items : null;
    }
  }

  // Timed out — abort and grab partial
  console.log("[ads-library] Polling timed out, aborting run");
  await abortRun(token, runId);
  const items = await fetchDatasetItems(token, datasetId);
  return items.length > 0 ? items : null;
}

async function abortRun(token: string, runId: string): Promise<void> {
  try {
    await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}/abort?token=${token}`, {
      method: "POST",
    });
  } catch {
    // Ignore
  }
}

async function fetchDatasetItems(
  token: string,
  datasetId: string
): Promise<CuriousCoderAdItem[]> {
  const url = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=${MAX_ITEMS}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildAdsLibraryUrl(brandName: string): string {
  const encoded = encodeURIComponent(brandName);
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encoded}&search_type=keyword_unordered`;
}

// ─── curious_coder Response Shape ───────────────────────────────────────────

interface CuriousCoderAdItem {
  ad_archive_id?: string;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  start_date?: string | number;
  end_date?: string | number;
  start_date_formatted?: string;
  end_date_formatted?: string;
  publisher_platform?: string[];
  impressions_with_index?: {
    impressions_text?: string;
    impressions_index?: number;
  };
  snapshot?: {
    page_name?: string;
    page_profile_picture_url?: string;
    body?: { text?: string };
    caption?: string;
    cta_text?: string;
    cards?: {
      body?: string;
      title?: string;
      link_url?: string;
      link_description?: string;
      resized_image_url?: string;
      original_image_url?: string;
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
    }[];
    images?: { original_image_url?: string; resized_image_url?: string }[];
    videos?: {
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
    }[];
    link_url?: string;
    link_description?: string;
    link_title?: string;
  };
  ad_library_url?: string;
  url?: string;
  targeted_or_reached_countries?: string[];
}

function mapCuriousCoderItems(
  items: CuriousCoderAdItem[],
  params: AdsLibraryScrapeParams
): AdsLibraryAd[] {
  return items.slice(0, MAX_ITEMS).map((item, i) => {
    const snap = item.snapshot;
    const card = snap?.cards?.[0];
    const id = item.ad_archive_id || `apify_${i}`;

    // Thumbnail: card image > snapshot images > video preview
    const thumbnail =
      card?.resized_image_url ||
      card?.original_image_url ||
      card?.video_preview_image_url ||
      snap?.images?.[0]?.resized_image_url ||
      snap?.images?.[0]?.original_image_url ||
      snap?.videos?.[0]?.video_preview_image_url ||
      null;

    // Headline: card title > link_title > first 80 chars of body
    const headline =
      card?.title ||
      snap?.link_title ||
      card?.body?.slice(0, 80) ||
      snap?.body?.text?.slice(0, 80) ||
      "Untitled Ad";

    // Body text
    const bodyText =
      card?.body ||
      snap?.body?.text ||
      card?.link_description ||
      snap?.link_description ||
      "";

    // Link URL
    const linkUrl = card?.link_url || snap?.link_url || null;

    // Media type detection
    let mediaType: AdsLibraryAd["mediaType"] = "image";
    if (card?.video_hd_url || card?.video_sd_url || snap?.videos?.length) {
      mediaType = "video";
    } else if (snap?.cards && snap.cards.length > 1) {
      mediaType = "carousel";
    }

    // Platforms
    const platforms = (item.publisher_platform || ["facebook"]) as AdsLibraryAd["platforms"];

    // Start/end dates — actor returns Unix timestamps (seconds)
    const startDate = item.start_date
      ? typeof item.start_date === "number"
        ? new Date(item.start_date * 1000).toISOString().split("T")[0]
        : String(item.start_date)
      : "";
    const endDate = item.end_date
      ? typeof item.end_date === "number"
        ? new Date(item.end_date * 1000).toISOString().split("T")[0]
        : String(item.end_date)
      : null;

    return {
      id,
      pageId: item.page_id || "",
      pageName: item.page_name || snap?.page_name || params.brandName,
      headline,
      bodyText,
      linkUrl,
      mediaType,
      mediaThumbnailUrl: thumbnail,
      startDate,
      endDate,
      isActive: item.is_active ?? true,
      impressionRange: null, // curious_coder uses impressions_text (e.g. "> 1M"), not numeric range
      platforms,
      adsLibraryUrl:
        item.ad_library_url ||
        item.url ||
        `https://www.facebook.com/ads/library/?id=${id}`,
    };
  });
}

// ─── Mock Fallback ──────────────────────────────────────────────────────────

function getMockResult(params: AdsLibraryScrapeParams): AdsLibraryScrapeResult {
  const count = Math.min(params.topN, MAX_ITEMS);
  const mockAds: AdsLibraryAd[] = Array.from({ length: count }, (_, i) => ({
    id: `mock_${crypto.randomUUID().slice(0, 8)}`,
    pageId: `page_${params.brandName.toLowerCase().replace(/\s+/g, "_")}`,
    pageName: params.brandName,
    headline: MOCK_HEADLINES[i % MOCK_HEADLINES.length],
    bodyText: MOCK_BODY_TEXTS[i % MOCK_BODY_TEXTS.length],
    linkUrl: `https://example.com/${params.brandName.toLowerCase().replace(/\s+/g, "-")}`,
    mediaType: MOCK_MEDIA_TYPES[i % MOCK_MEDIA_TYPES.length],
    mediaThumbnailUrl: `https://picsum.photos/seed/${params.brandName}${i}/400/400`,
    startDate: getRandomStartDate(params.startedWithin),
    endDate: null,
    isActive: true,
    impressionRange: {
      lower: Math.floor(Math.random() * 50000) + 1000,
      upper: Math.floor(Math.random() * 100000) + 50000,
    },
    platforms: ["facebook", "instagram"],
    adsLibraryUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(params.brandName)}&search_type=keyword_unordered`,
  }));

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

function getRandomStartDate(
  startedWithin: AdsLibraryScrapeParams["startedWithin"]
): string {
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
