import { scrapeAdsLibrary } from "@/lib/meta/ads-library";
import { db } from "@/lib/db";
import { boards, savedAds } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  DiscoverAd,
  DiscoverSearchParams,
  DiscoverSearchResult,
  BoardOption,
} from "@/types/discover";

// ─── Search Ads Library ─────────────────────────────────────────────────────

export async function searchAdsLibrary(
  params: DiscoverSearchParams
): Promise<DiscoverSearchResult> {
  const { query, pageId, activeOnly, format, sort, country, scrapeCount } = params;

  if (!query.trim()) {
    return { ads: [], totalCount: 0 };
  }

  // Map format to scraper mediaType (carousel not supported at source, filters client-side)
  const scraperMediaType = format === "image" || format === "video" ? format : "all";

  // Fetch from scraper — count controlled by user
  const result = await scrapeAdsLibrary({
    brandName: query,
    pageId,
    topN: scrapeCount,
    country: country || "ALL",
    mediaType: scraperMediaType,
    impressionPeriod: "last_30d",
    startedWithin: "last_90d",
  });

  // Map to DiscoverAd
  let ads: DiscoverAd[] = result.ads.map((ad) => {
    const startMs = new Date(ad.startDate).getTime();
    const endMs = ad.endDate ? new Date(ad.endDate).getTime() : Date.now();
    const runtimeDays = Number.isFinite(startMs) && Number.isFinite(endMs)
      ? Math.max(1, Math.ceil((endMs - startMs) / 86_400_000))
      : 1;

    return {
      id: ad.id,
      pageName: ad.pageName,
      headline: ad.headline,
      bodyText: ad.bodyText,
      linkUrl: ad.linkUrl,
      mediaType: ad.mediaType,
      mediaThumbnailUrl: ad.mediaThumbnailUrl,
      startDate: ad.startDate,
      endDate: ad.endDate,
      isActive: ad.isActive,
      impressionRange: ad.impressionRange,
      platforms: ad.platforms,
      adsLibraryUrl: ad.adsLibraryUrl,
      runtimeDays,
    };
  });

  // Filter: active only
  if (activeOnly) {
    ads = ads.filter((a) => a.isActive);
  }

  // Filter: carousel client-side (not supported at source)
  if (format === "carousel") {
    ads = ads.filter((a) => a.mediaType === "carousel");
  }

  // Sort
  switch (sort) {
    case "newest":
      ads.sort((a, b) => b.startDate.localeCompare(a.startDate));
      break;
    case "oldest":
      ads.sort((a, b) => a.startDate.localeCompare(b.startDate));
      break;
    case "impressions":
      ads.sort(
        (a, b) =>
          (b.impressionRange?.upper ?? 0) - (a.impressionRange?.upper ?? 0)
      );
      break;
  }

  return {
    ads,
    totalCount: ads.length,
  };
}

// ─── Board Operations ───────────────────────────────────────────────────────

export async function getWorkspaceBoards(
  workspaceId: string
): Promise<BoardOption[]> {
  const rows = await db
    .select({ id: boards.id, name: boards.name })
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .orderBy(asc(boards.name));

  return rows.map((b) => ({ id: b.id, name: b.name }));
}

export async function saveAdToBoard(
  workspaceId: string,
  boardId: string,
  ad: DiscoverAd
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(savedAds).values({
      boardId,
      workspaceId,
      source: "discover",
      metaLibraryId: ad.id,
      brandName: ad.pageName,
      headline: ad.headline,
      body: ad.bodyText,
      format: ad.mediaType,
      imageUrl: ad.mediaThumbnailUrl,
      landingPageUrl: ad.linkUrl,
      platforms: ad.platforms,
      startDate: ad.startDate || null,
      runtimeDays: ad.runtimeDays,
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
