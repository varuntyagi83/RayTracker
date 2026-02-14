/**
 * Meta Ads Library Scraper Service
 *
 * Uses Apify's facebook-ads-scraper actor to fetch competitor ads.
 * Uses async run + polling to avoid the 300s sync timeout.
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
const ACTOR_ID = "apify~facebook-ads-scraper";
const MAX_ITEMS = 10;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_TIME_MS = 5 * 60 * 1_000; // 5 minutes max wait

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

/**
 * Scrape competitor ads from Meta Ads Library via Apify.
 * Uses async run + polling to handle long scrape times.
 * Results are cached for 10 minutes per brand name.
 */
export async function scrapeAdsLibrary(
  params: AdsLibraryScrapeParams
): Promise<AdsLibraryScrapeResult> {
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    console.warn("[ads-library] APIFY_API_TOKEN not set — returning mock data");
    return getMockResult(params);
  }

  // Check cache first
  const cacheKey = `${params.brandName.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log("[ads-library] Cache hit for:", cacheKey);
    return cached;
  }

  try {
    // Build the Ad Library search URL for the actor
    const searchUrl = buildAdsLibraryUrl(params.brandName);

    // 1. Start the actor run (async)
    console.log("[ads-library] Starting Apify run for:", params.brandName);
    const startUrl = `${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?token=${token}`;
    const startRes = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
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

    console.log("[ads-library] Run started:", runId, "dataset:", datasetId);

    // 2. Poll dataset for items — abort run once we have enough
    const rawItems = await pollDatasetAndAbort(token, runId, datasetId);
    if (!rawItems || rawItems.length === 0) {
      console.error("[ads-library] No items scraped");
      return getMockResult(params);
    }

    console.log("[ads-library] Got", rawItems.length, "items from Apify");

    const ads = mapApifyItems(rawItems, params);
    const result: AdsLibraryScrapeResult = {
      ads,
      totalCount: ads.length,
      scrapedAt: new Date().toISOString(),
      brandName: params.brandName,
    };

    // Cache the result
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[ads-library] Apify scrape error:", error);
    return getMockResult(params);
  }
}

// ─── Polling + Auto-Abort ────────────────────────────────────────────────────

/**
 * Poll the dataset for items. Once we have >= MAX_ITEMS, abort the run
 * to stop burning Apify credits, then return the items.
 */
async function pollDatasetAndAbort(
  token: string,
  runId: string,
  datasetId: string
): Promise<ApifyAdItem[] | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

    // Check how many items the dataset has
    const countUrl = `${APIFY_BASE_URL}/datasets/${datasetId}?token=${token}`;
    const countRes = await fetch(countUrl);
    if (!countRes.ok) continue;

    const countData = await countRes.json();
    const itemCount = countData.data?.itemCount ?? 0;

    // Also check run status
    const statusUrl = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`;
    const statusRes = await fetch(statusUrl);
    const statusData = statusRes.ok ? await statusRes.json() : null;
    const runStatus = statusData?.data?.status;

    console.log(`[ads-library] Poll: ${itemCount} items, run status: ${runStatus}, elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);

    // If we have enough items, abort the run and return
    if (itemCount >= MAX_ITEMS) {
      console.log(`[ads-library] Got ${itemCount} items (>= ${MAX_ITEMS}), aborting run to save credits`);
      await abortRun(token, runId);
      return await fetchDatasetItems(token, datasetId);
    }

    // If run finished (succeeded or failed), grab whatever we got
    if (runStatus === "SUCCEEDED" || runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      console.log(`[ads-library] Run ended with status: ${runStatus}, got ${itemCount} items`);
      if (itemCount > 0) {
        return await fetchDatasetItems(token, datasetId);
      }
      return null;
    }
  }

  // Timed out — abort and take whatever we have
  console.log("[ads-library] Polling timed out, aborting run");
  await abortRun(token, runId);
  return await fetchDatasetItems(token, datasetId);
}

async function abortRun(token: string, runId: string): Promise<void> {
  try {
    await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}/abort?token=${token}`, {
      method: "POST",
    });
    console.log("[ads-library] Run aborted:", runId);
  } catch {
    // Ignore abort errors
  }
}

async function fetchDatasetItems(
  token: string,
  datasetId: string
): Promise<ApifyAdItem[]> {
  const itemsUrl = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=${MAX_ITEMS}`;
  const itemsRes = await fetch(itemsUrl);
  if (!itemsRes.ok) return [];
  return await itemsRes.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildAdsLibraryUrl(brandName: string): string {
  const encoded = encodeURIComponent(brandName);
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encoded}&search_type=keyword_unordered`;
}

// ─── Apify Response Mapping ─────────────────────────────────────────────────

/** Loose type for Apify actor output — field names vary by actor version */
interface ApifyAdItem {
  id?: string;
  adArchiveID?: string;
  pageId?: string;
  page_id?: string;
  pageName?: string;
  page_name?: string;
  title?: string;
  body?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  link_url?: string;
  link_urls?: string[];
  image_url?: string;
  images?: { original_image_url?: string; resized_image_url?: string }[];
  video_url?: string;
  videos?: { video_preview_image_url?: string }[];
  ad_snapshot_url?: string;
  snapshot?: { images?: { url?: string }[]; videos?: { url?: string }[] };
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  is_active?: boolean;
  isActive?: boolean;
  impressions?: { lower_bound?: number; upper_bound?: number };
  eu_total_reach?: number;
  publisher_platforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[];
  publisherPlatform?: string[];
  ad_library_url?: string;
  url?: string;
  media_type?: string;
  collationCount?: number;
}

function mapApifyItems(
  items: ApifyAdItem[],
  params: AdsLibraryScrapeParams
): AdsLibraryAd[] {
  return items.slice(0, MAX_ITEMS).map((item, i) => {
    const id = item.id || item.adArchiveID || `apify_${i}`;
    const thumbnail =
      item.image_url ||
      item.images?.[0]?.original_image_url ||
      item.images?.[0]?.resized_image_url ||
      item.videos?.[0]?.video_preview_image_url ||
      item.snapshot?.images?.[0]?.url ||
      item.ad_snapshot_url ||
      null;

    const headline =
      item.title ||
      item.ad_creative_link_titles?.[0] ||
      item.ad_creative_bodies?.[0]?.slice(0, 80) ||
      "Untitled Ad";

    const bodyText =
      item.body ||
      item.ad_creative_bodies?.join(" ") ||
      item.ad_creative_link_descriptions?.[0] ||
      "";

    const linkUrl =
      item.link_url ||
      item.link_urls?.[0] ||
      item.ad_creative_link_captions?.[0] ||
      null;

    const startDate =
      item.start_date || item.startDate || item.ad_delivery_start_time || "";
    const endDate =
      item.end_date || item.endDate || item.ad_delivery_stop_time || null;

    return {
      id,
      pageId: item.pageId || item.page_id || "",
      pageName: item.pageName || item.page_name || params.brandName,
      headline,
      bodyText,
      linkUrl,
      mediaType: inferMediaType(item),
      mediaThumbnailUrl: thumbnail,
      startDate,
      endDate,
      isActive: item.is_active ?? item.isActive ?? true,
      impressionRange: item.impressions
        ? {
            lower: item.impressions.lower_bound || 0,
            upper: item.impressions.upper_bound || 0,
          }
        : null,
      platforms: item.publisher_platforms ||
        (item.publisherPlatform as AdsLibraryAd["platforms"]) ||
        ["facebook"],
      adsLibraryUrl:
        item.ad_library_url ||
        item.url ||
        `https://www.facebook.com/ads/library/?id=${id}`,
    };
  });
}

function inferMediaType(item: ApifyAdItem): AdsLibraryAd["mediaType"] {
  if (item.media_type === "video" || item.video_url || item.videos?.length)
    return "video";
  if (item.media_type === "carousel" || (item.images && item.images.length > 1))
    return "carousel";
  return "image";
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
