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
  const { query, activeOnly, format, sort, country, page, perPage } = params;

  if (!query.trim()) {
    return { ads: [], totalCount: 0, page, perPage, totalPages: 0 };
  }

  // Fetch from scraper (mock or real) — limited to 10 to save Apify credits
  const result = await scrapeAdsLibrary({
    brandName: query,
    topN: 10,
    country: country || "ALL",
    impressionPeriod: "last_30d",
    startedWithin: "last_90d",
  });

  // Map to DiscoverAd
  let ads: DiscoverAd[] = result.ads.map((ad) => {
    const start = new Date(ad.startDate);
    const end = ad.endDate ? new Date(ad.endDate) : new Date();
    const runtimeDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));

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

  // Filter: format
  if (format !== "all") {
    ads = ads.filter((a) => a.mediaType === format);
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

  // Paginate
  const totalCount = ads.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedAds = ads.slice(start, start + perPage);

  return {
    ads: paginatedAds,
    totalCount,
    page,
    perPage,
    totalPages,
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
