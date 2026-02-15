import { scrapeAdsLibrary } from "@/lib/meta/ads-library";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { query, activeOnly, format, sort, country, scrapeCount } = params;

  if (!query.trim()) {
    return { ads: [], totalCount: 0 };
  }

  // Map format to scraper mediaType (carousel not supported at source, filters client-side)
  const scraperMediaType = format === "image" || format === "video" ? format : "all";

  // Fetch from scraper — count controlled by user
  const result = await scrapeAdsLibrary({
    brandName: query,
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
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("boards")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");

  return (data ?? []).map((b) => ({ id: b.id, name: b.name }));
}

export async function saveAdToBoard(
  workspaceId: string,
  boardId: string,
  ad: DiscoverAd
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("saved_ads").insert({
    board_id: boardId,
    workspace_id: workspaceId,
    source: "discover",
    meta_library_id: ad.id,
    brand_name: ad.pageName,
    headline: ad.headline,
    body: ad.bodyText,
    format: ad.mediaType,
    image_url: ad.mediaThumbnailUrl,
    landing_page_url: ad.linkUrl,
    platforms: ad.platforms,
    start_date: ad.startDate || null,
    runtime_days: ad.runtimeDays,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
