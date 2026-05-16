import { db } from "@/lib/db";
import { competitorBrands, competitorAds, competitorReports } from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
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
  const brands = await db
    .select()
    .from(competitorBrands)
    .where(eq(competitorBrands.workspaceId, workspaceId))
    .orderBy(desc(competitorBrands.lastScrapedAt));

  if (brands.length === 0) return [];

  // Get ad counts per brand
  const brandIds = brands.map((b) => b.id);
  const adCountRows = await db
    .select({ competitorBrandId: competitorAds.competitorBrandId })
    .from(competitorAds)
    .where(
      and(
        eq(competitorAds.workspaceId, workspaceId),
        inArray(competitorAds.competitorBrandId, brandIds)
      )
    );

  const countMap: Record<string, number> = {};
  for (const row of adCountRows) {
    countMap[row.competitorBrandId] = (countMap[row.competitorBrandId] ?? 0) + 1;
  }

  return brands.map((b) => ({
    id: b.id,
    workspaceId: b.workspaceId,
    name: b.name,
    metaAdsLibraryUrl: b.metaAdsLibraryUrl,
    description: b.description,
    lastScrapedAt: b.lastScrapedAt ? b.lastScrapedAt.toISOString() : null,
    adCount: countMap[b.id] ?? 0,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));
}

// ─── Save Scrape Run ──────────────────────────────────────────────────────

export async function saveCompetitorScrapeRun(
  workspaceId: string,
  brandName: string,
  ads: DiscoverAd[],
  metaAdsLibraryUrl?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Find or create competitor brand
  const [existingBrand] = await db
    .select({ id: competitorBrands.id })
    .from(competitorBrands)
    .where(and(eq(competitorBrands.workspaceId, workspaceId), eq(competitorBrands.name, brandName)))
    .limit(1);

  let brandId: string;

  if (existingBrand) {
    brandId = existingBrand.id;
    await db
      .update(competitorBrands)
      .set({
        lastScrapedAt: new Date(),
        updatedAt: new Date(),
        ...(metaAdsLibraryUrl ? { metaAdsLibraryUrl } : {}),
      })
      .where(eq(competitorBrands.id, brandId));
  } else {
    const [newBrand] = await db
      .insert(competitorBrands)
      .values({
        workspaceId,
        name: brandName,
        lastScrapedAt: new Date(),
        ...(metaAdsLibraryUrl ? { metaAdsLibraryUrl } : {}),
      })
      .returning({ id: competitorBrands.id });

    if (!newBrand) {
      return { success: false, error: "Failed to create brand" };
    }
    brandId = newBrand.id;
  }

  // 2. Batch upsert all ads in one roundtrip
  const scrapedAt = new Date();
  const rows = ads.map((ad) => ({
    competitorBrandId: brandId,
    workspaceId,
    metaLibraryId: ad.id,
    headline: ad.headline || null,
    bodyText: ad.bodyText || null,
    format: ad.mediaType,
    mediaType: ad.mediaType,
    imageUrl: ad.mediaThumbnailUrl || null,
    landingPageUrl: ad.linkUrl || null,
    platforms: ad.platforms,
    startDate: ad.startDate || null,
    runtimeDays: ad.runtimeDays,
    isActive: ad.isActive,
    adsLibraryUrl: ad.adsLibraryUrl,
    scrapedAt,
  }));

  try {
    await db
      .insert(competitorAds)
      .values(rows)
      .onConflictDoUpdate({
        target: [competitorAds.workspaceId, competitorAds.metaLibraryId],
        set: {
          headline: sql`excluded.headline`,
          bodyText: sql`excluded.body_text`,
          format: sql`excluded.format`,
          mediaType: sql`excluded.media_type`,
          imageUrl: sql`excluded.image_url`,
          landingPageUrl: sql`excluded.landing_page_url`,
          platforms: sql`excluded.platforms`,
          startDate: sql`excluded.start_date`,
          runtimeDays: sql`excluded.runtime_days`,
          isActive: sql`excluded.is_active`,
          adsLibraryUrl: sql`excluded.ads_library_url`,
          scrapedAt: sql`excluded.scraped_at`,
        },
      });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upsert failed" };
  }

  return { success: true };
}

// ─── Delete Brands ────────────────────────────────────────────────────────

export async function deleteCompetitorBrands(
  workspaceId: string,
  brandIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete brands (competitor_ads cascade via FK)
    await db
      .delete(competitorBrands)
      .where(
        and(
          eq(competitorBrands.workspaceId, workspaceId),
          inArray(competitorBrands.id, brandIds)
        )
      );

    // Delete reports that reference any of the deleted brand IDs.
    // Drizzle has no native array-overlap operator, so use a raw SQL fragment
    // with the Postgres && (overlaps) operator on the text[] column.
    await db
      .delete(competitorReports)
      .where(
        and(
          eq(competitorReports.workspaceId, workspaceId),
          sql`${competitorReports.competitorBrandIds} && ${brandIds}::text[]`
        )
      );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
}

// ─── Get Ads for Brands ──────────────────────────────────────────────────

export async function getCompetitorAdsForBrands(
  workspaceId: string,
  brandIds: string[]
): Promise<CompetitorAd[]> {
  const rows = await db
    .select()
    .from(competitorAds)
    .where(
      and(
        eq(competitorAds.workspaceId, workspaceId),
        inArray(competitorAds.competitorBrandId, brandIds)
      )
    )
    .orderBy(desc(competitorAds.scrapedAt));

  return rows.map(mapCompetitorAd);
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
  const [inserted] = await db
    .insert(competitorReports)
    .values({
      workspaceId,
      title: report.title,
      competitorBrandIds: report.competitorBrandIds,
      competitorBrandNames: report.competitorBrandNames,
      adCount: report.adCount,
      perAdAnalyses: report.perAdAnalyses,
      crossBrandSummary: report.crossBrandSummary,
      model: report.model,
      creditsUsed: report.creditsUsed,
    })
    .returning({ id: competitorReports.id });

  if (!inserted) {
    return { success: false, error: "Failed to save report" };
  }

  return { success: true, id: inserted.id };
}

export async function listCompetitorReports(
  workspaceId: string
): Promise<CompetitorReport[]> {
  const rows = await db
    .select()
    .from(competitorReports)
    .where(eq(competitorReports.workspaceId, workspaceId))
    .orderBy(desc(competitorReports.createdAt));

  return rows.map(mapCompetitorReport);
}

export async function getCompetitorReport(
  workspaceId: string,
  reportId: string
): Promise<CompetitorReport | null> {
  const [row] = await db
    .select()
    .from(competitorReports)
    .where(and(eq(competitorReports.workspaceId, workspaceId), eq(competitorReports.id, reportId)))
    .limit(1);

  if (!row) return null;
  return mapCompetitorReport(row);
}

export async function deleteCompetitorReport(
  workspaceId: string,
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(competitorReports)
      .where(and(eq(competitorReports.workspaceId, workspaceId), eq(competitorReports.id, reportId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type CompetitorAdRow = typeof competitorAds.$inferSelect;
type CompetitorReportRow = typeof competitorReports.$inferSelect;

function mapCompetitorAd(row: CompetitorAdRow): CompetitorAd {
  return {
    id: row.id,
    competitorBrandId: row.competitorBrandId,
    workspaceId: row.workspaceId,
    metaLibraryId: row.metaLibraryId,
    headline: row.headline,
    bodyText: row.bodyText,
    format: row.format,
    mediaType: row.mediaType,
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    landingPageUrl: row.landingPageUrl,
    platforms: row.platforms ?? [],
    startDate: row.startDate,
    runtimeDays: row.runtimeDays,
    isActive: row.isActive,
    adsLibraryUrl: row.adsLibraryUrl,
    scrapedAt: row.scrapedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapCompetitorReport(row: CompetitorReportRow): CompetitorReport {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    competitorBrandIds: row.competitorBrandIds ?? [],
    competitorBrandNames: row.competitorBrandNames ?? [],
    adCount: row.adCount,
    perAdAnalyses: (row.perAdAnalyses ?? []) as CompetitorAdAnalysis[],
    crossBrandSummary: (row.crossBrandSummary ?? {}) as CrossBrandSummary,
    model: row.model,
    creditsUsed: row.creditsUsed,
    createdAt: row.createdAt.toISOString(),
  };
}
