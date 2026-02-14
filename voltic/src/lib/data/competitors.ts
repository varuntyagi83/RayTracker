import { createAdminClient } from "@/lib/supabase/admin";
import type { DiscoverAd } from "@/types/discover";
import type {
  CompetitorBrand,
  CompetitorAd,
  CompetitorReport,
  CompetitorAdAnalysis,
  CrossBrandSummary,
} from "@/types/competitors";

// ─── Competitor Brands ────────────────────────────────────────────────────

export async function listCompetitorBrands(
  workspaceId: string
): Promise<CompetitorBrand[]> {
  const supabase = createAdminClient();

  const { data: brands } = await supabase
    .from("competitor_brands")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_scraped_at", { ascending: false, nullsFirst: false });

  if (!brands || brands.length === 0) return [];

  // Get ad counts per brand
  const brandIds = brands.map((b) => b.id);
  const { data: adCounts } = await supabase
    .from("competitor_ads")
    .select("competitor_brand_id")
    .eq("workspace_id", workspaceId)
    .in("competitor_brand_id", brandIds);

  const countMap: Record<string, number> = {};
  for (const row of adCounts ?? []) {
    countMap[row.competitor_brand_id] =
      (countMap[row.competitor_brand_id] ?? 0) + 1;
  }

  return brands.map((b) => ({
    id: b.id,
    workspaceId: b.workspace_id,
    name: b.name,
    metaAdsLibraryUrl: b.meta_ads_library_url,
    description: b.description,
    lastScrapedAt: b.last_scraped_at,
    adCount: countMap[b.id] ?? 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }));
}

// ─── Save Scrape Run ──────────────────────────────────────────────────────

export async function saveCompetitorScrapeRun(
  workspaceId: string,
  brandName: string,
  ads: DiscoverAd[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // 1. Upsert competitor brand
  const { data: existingBrand } = await supabase
    .from("competitor_brands")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", brandName)
    .single();

  let brandId: string;

  if (existingBrand) {
    brandId = existingBrand.id;
    await supabase
      .from("competitor_brands")
      .update({
        last_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", brandId);
  } else {
    const { data: newBrand, error: insertErr } = await supabase
      .from("competitor_brands")
      .insert({
        workspace_id: workspaceId,
        name: brandName,
        last_scraped_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !newBrand) {
      return { success: false, error: insertErr?.message ?? "Failed to create brand" };
    }
    brandId = newBrand.id;
  }

  // 2. Upsert each ad
  for (const ad of ads) {
    await supabase.from("competitor_ads").upsert(
      {
        competitor_brand_id: brandId,
        workspace_id: workspaceId,
        meta_library_id: ad.id,
        headline: ad.headline || null,
        body_text: ad.bodyText || null,
        format: ad.mediaType,
        media_type: ad.mediaType,
        image_url: ad.mediaThumbnailUrl || null,
        landing_page_url: ad.linkUrl || null,
        platforms: ad.platforms,
        start_date: ad.startDate || null,
        runtime_days: ad.runtimeDays,
        is_active: ad.isActive,
        ads_library_url: ad.adsLibraryUrl,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,meta_library_id" }
    );
  }

  return { success: true };
}

// ─── Delete Brands ────────────────────────────────────────────────────────

export async function deleteCompetitorBrands(
  workspaceId: string,
  brandIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Delete brands (competitor_ads cascade via FK)
  const { error } = await supabase
    .from("competitor_brands")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", brandIds);

  if (error) return { success: false, error: error.message };

  // Also delete reports that reference these brands
  // (Reports store brand IDs as text array, so we filter in-app)
  const { data: reports } = await supabase
    .from("competitor_reports")
    .select("id, competitor_brand_ids")
    .eq("workspace_id", workspaceId);

  if (reports) {
    const reportIdsToDelete = reports
      .filter((r) => {
        const rBrandIds = r.competitor_brand_ids as string[];
        return rBrandIds.some((id) => brandIds.includes(id));
      })
      .map((r) => r.id);

    if (reportIdsToDelete.length > 0) {
      await supabase
        .from("competitor_reports")
        .delete()
        .in("id", reportIdsToDelete);
    }
  }

  return { success: true };
}

// ─── Get Ads for Brands ──────────────────────────────────────────────────

export async function getCompetitorAdsForBrands(
  workspaceId: string,
  brandIds: string[]
): Promise<CompetitorAd[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("competitor_ads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("competitor_brand_id", brandIds)
    .order("scraped_at", { ascending: false });

  return (data ?? []).map(mapCompetitorAd);
}

// ─── Reports ──────────────────────────────────────────────────────────────

export async function saveCompetitorReport(
  workspaceId: string,
  report: {
    title: string;
    competitorBrandIds: string[];
    competitorBrandNames: string[];
    adCount: number;
    perAdAnalyses: CompetitorAdAnalysis[];
    crossBrandSummary: CrossBrandSummary;
    model: string;
    creditsUsed: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("competitor_reports")
    .insert({
      workspace_id: workspaceId,
      title: report.title,
      competitor_brand_ids: report.competitorBrandIds,
      competitor_brand_names: report.competitorBrandNames,
      ad_count: report.adCount,
      per_ad_analyses: report.perAdAnalyses,
      cross_brand_summary: report.crossBrandSummary,
      model: report.model,
      credits_used: report.creditsUsed,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to save report" };
  }

  return { success: true, id: data.id };
}

export async function listCompetitorReports(
  workspaceId: string
): Promise<CompetitorReport[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("competitor_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapCompetitorReport);
}

export async function getCompetitorReport(
  workspaceId: string,
  reportId: string
): Promise<CompetitorReport | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("competitor_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", reportId)
    .single();

  if (!data) return null;
  return mapCompetitorReport(data);
}

export async function deleteCompetitorReport(
  workspaceId: string,
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("competitor_reports")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", reportId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompetitorAd(row: any): CompetitorAd {
  return {
    id: row.id,
    competitorBrandId: row.competitor_brand_id,
    workspaceId: row.workspace_id,
    metaLibraryId: row.meta_library_id,
    headline: row.headline,
    bodyText: row.body_text,
    format: row.format,
    mediaType: row.media_type,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    landingPageUrl: row.landing_page_url,
    platforms: row.platforms ?? [],
    startDate: row.start_date,
    runtimeDays: row.runtime_days,
    isActive: row.is_active,
    adsLibraryUrl: row.ads_library_url,
    scrapedAt: row.scraped_at,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompetitorReport(row: any): CompetitorReport {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    competitorBrandIds: row.competitor_brand_ids ?? [],
    competitorBrandNames: row.competitor_brand_names ?? [],
    adCount: row.ad_count,
    perAdAnalyses: (row.per_ad_analyses ?? []) as CompetitorAdAnalysis[],
    crossBrandSummary: (row.cross_brand_summary ?? {}) as CrossBrandSummary,
    model: row.model,
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  };
}
