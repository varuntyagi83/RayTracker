import { db } from "@/lib/db";
import { campaigns, campaignMetrics, creatives, creativeMetrics } from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import type {
  ReportParams,
  ReportResult,
  TopAdRow,
  TopCampaignRow,
  TopCreativeRow,
  TopLandingPageRow,
  TopHeadlineRow,
  TopCopyRow,
} from "@/types/reports";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  key: string,
  direction: "asc" | "desc"
): T[] {
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal ?? "");
    const bStr = String(bVal ?? "");
    return direction === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
}

function paginate<T>(rows: T[], page: number, pageSize: number): ReportResult<T> {
  const totalCount = rows.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ─── Top Ads ────────────────────────────────────────────────────────────────

export async function getTopAdsReport(
  params: ReportParams
): Promise<ReportResult<TopAdRow>> {
  const creativeRows = await db
    .select({
      id: creatives.id,
      name: creatives.name,
      headline: creatives.headline,
      format: creatives.format,
    })
    .from(creatives)
    .where(eq(creatives.workspaceId, params.workspaceId));

  if (creativeRows.length === 0) return paginate([], params.page, params.pageSize);

  // Fetch all metrics for the date range in one query
  const metricRows = await db
    .select({
      creativeId: creativeMetrics.creativeId,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
      purchases: creativeMetrics.purchases,
    })
    .from(creativeMetrics)
    .where(
      and(
        gte(creativeMetrics.date, params.dateRange.from),
        lte(creativeMetrics.date, params.dateRange.to)
      )
    );

  // Aggregate metrics per creative
  const metricsMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; purchases: number }>();
  for (const m of metricRows) {
    const existing = metricsMap.get(m.creativeId) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    existing.spend += Number(m.spend);
    existing.revenue += Number(m.revenue);
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    existing.purchases += m.purchases;
    metricsMap.set(m.creativeId, existing);
  }

  const rows: TopAdRow[] = creativeRows.map((c) => {
    const agg = metricsMap.get(c.id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    return {
      id: c.id,
      name: c.name,
      headline: c.headline,
      format: c.format,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      purchases: agg.purchases,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Campaigns ──────────────────────────────────────────────────────────

export async function getTopCampaignsReport(
  params: ReportParams
): Promise<ReportResult<TopCampaignRow>> {
  const campaignRows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      objective: campaigns.objective,
    })
    .from(campaigns)
    .where(eq(campaigns.workspaceId, params.workspaceId));

  if (campaignRows.length === 0) return paginate([], params.page, params.pageSize);

  const metricRows = await db
    .select({
      campaignId: campaignMetrics.campaignId,
      spend: campaignMetrics.spend,
      revenue: campaignMetrics.revenue,
      impressions: campaignMetrics.impressions,
      clicks: campaignMetrics.clicks,
      purchases: campaignMetrics.purchases,
    })
    .from(campaignMetrics)
    .where(
      and(
        gte(campaignMetrics.date, params.dateRange.from),
        lte(campaignMetrics.date, params.dateRange.to)
      )
    );

  const metricsMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; purchases: number }>();
  for (const m of metricRows) {
    const existing = metricsMap.get(m.campaignId) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    existing.spend += Number(m.spend);
    existing.revenue += Number(m.revenue);
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    existing.purchases += m.purchases;
    metricsMap.set(m.campaignId, existing);
  }

  const rows: TopCampaignRow[] = campaignRows.map((c) => {
    const agg = metricsMap.get(c.id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      purchases: agg.purchases,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Creatives ──────────────────────────────────────────────────────────

export async function getTopCreativesReport(
  params: ReportParams
): Promise<ReportResult<TopCreativeRow>> {
  const creativeRows = await db
    .select({
      id: creatives.id,
      name: creatives.name,
      format: creatives.format,
      imageUrl: creatives.imageUrl,
    })
    .from(creatives)
    .where(eq(creatives.workspaceId, params.workspaceId));

  if (creativeRows.length === 0) return paginate([], params.page, params.pageSize);

  const metricRows = await db
    .select({
      creativeId: creativeMetrics.creativeId,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
    })
    .from(creativeMetrics)
    .where(
      and(
        gte(creativeMetrics.date, params.dateRange.from),
        lte(creativeMetrics.date, params.dateRange.to)
      )
    );

  const metricsMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number }>();
  for (const m of metricRows) {
    const existing = metricsMap.get(m.creativeId) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    existing.spend += Number(m.spend);
    existing.revenue += Number(m.revenue);
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    metricsMap.set(m.creativeId, existing);
  }

  const rows: TopCreativeRow[] = creativeRows.map((c) => {
    const agg = metricsMap.get(c.id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    return {
      id: c.id,
      name: c.name,
      format: c.format,
      imageUrl: c.imageUrl,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Landing Pages ──────────────────────────────────────────────────────

export async function getTopLandingPagesReport(
  params: ReportParams
): Promise<ReportResult<TopLandingPageRow>> {
  const creativeRows = await db
    .select({
      id: creatives.id,
      landingPageUrl: creatives.landingPageUrl,
    })
    .from(creatives)
    .where(and(eq(creatives.workspaceId, params.workspaceId), isNotNull(creatives.landingPageUrl)));

  if (creativeRows.length === 0) return paginate([], params.page, params.pageSize);

  const creativeIds = creativeRows.map((c) => c.id);

  const metricRows = await db
    .select({
      creativeId: creativeMetrics.creativeId,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
    })
    .from(creativeMetrics)
    .where(
      and(
        gte(creativeMetrics.date, params.dateRange.from),
        lte(creativeMetrics.date, params.dateRange.to)
      )
    );

  // Index metrics by creative id for fast lookup
  const metricsIndex = new Map<string, Array<{ spend: number; revenue: number; impressions: number; clicks: number }>>();
  for (const m of metricRows) {
    if (!creativeIds.includes(m.creativeId)) continue;
    const arr = metricsIndex.get(m.creativeId) ?? [];
    arr.push({ spend: Number(m.spend), revenue: Number(m.revenue), impressions: m.impressions, clicks: m.clicks });
    metricsIndex.set(m.creativeId, arr);
  }

  const lpMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number }>();
  for (const c of creativeRows) {
    if (!c.landingPageUrl) continue;
    const metrics = metricsIndex.get(c.id) ?? [];
    const existing = lpMap.get(c.landingPageUrl) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    for (const m of metrics) {
      existing.spend += m.spend;
      existing.revenue += m.revenue;
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
    }
    lpMap.set(c.landingPageUrl, existing);
  }

  const rows: TopLandingPageRow[] = Array.from(lpMap.entries()).map(
    ([landingPageUrl, agg]) => ({
      landingPageUrl,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    })
  );

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Headlines ──────────────────────────────────────────────────────────

export async function getTopHeadlinesReport(
  params: ReportParams
): Promise<ReportResult<TopHeadlineRow>> {
  const creativeRows = await db
    .select({
      id: creatives.id,
      headline: creatives.headline,
    })
    .from(creatives)
    .where(and(eq(creatives.workspaceId, params.workspaceId), isNotNull(creatives.headline)));

  if (creativeRows.length === 0) return paginate([], params.page, params.pageSize);

  const creativeIds = creativeRows.map((c) => c.id);

  const metricRows = await db
    .select({
      creativeId: creativeMetrics.creativeId,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
    })
    .from(creativeMetrics)
    .where(
      and(
        gte(creativeMetrics.date, params.dateRange.from),
        lte(creativeMetrics.date, params.dateRange.to)
      )
    );

  const metricsIndex = new Map<string, Array<{ spend: number; revenue: number; impressions: number; clicks: number }>>();
  for (const m of metricRows) {
    if (!creativeIds.includes(m.creativeId)) continue;
    const arr = metricsIndex.get(m.creativeId) ?? [];
    arr.push({ spend: Number(m.spend), revenue: Number(m.revenue), impressions: m.impressions, clicks: m.clicks });
    metricsIndex.set(m.creativeId, arr);
  }

  const headlineMap = new Map<string, { count: number; spend: number; revenue: number; impressions: number; clicks: number }>();
  for (const c of creativeRows) {
    if (!c.headline) continue;
    const metrics = metricsIndex.get(c.id) ?? [];
    const existing = headlineMap.get(c.headline) ?? { count: 0, spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    existing.count += 1;
    for (const m of metrics) {
      existing.spend += m.spend;
      existing.revenue += m.revenue;
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
    }
    headlineMap.set(c.headline, existing);
  }

  const rows: TopHeadlineRow[] = Array.from(headlineMap.entries()).map(
    ([headline, agg]) => ({
      headline,
      adCount: agg.count,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    })
  );

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Copy ───────────────────────────────────────────────────────────────

export async function getTopCopyReport(
  params: ReportParams
): Promise<ReportResult<TopCopyRow>> {
  const creativeRows = await db
    .select({
      id: creatives.id,
      body: creatives.body,
    })
    .from(creatives)
    .where(and(eq(creatives.workspaceId, params.workspaceId), isNotNull(creatives.body)));

  if (creativeRows.length === 0) return paginate([], params.page, params.pageSize);

  const creativeIds = creativeRows.map((c) => c.id);

  const metricRows = await db
    .select({
      creativeId: creativeMetrics.creativeId,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
    })
    .from(creativeMetrics)
    .where(
      and(
        gte(creativeMetrics.date, params.dateRange.from),
        lte(creativeMetrics.date, params.dateRange.to)
      )
    );

  const metricsIndex = new Map<string, Array<{ spend: number; revenue: number; impressions: number; clicks: number }>>();
  for (const m of metricRows) {
    if (!creativeIds.includes(m.creativeId)) continue;
    const arr = metricsIndex.get(m.creativeId) ?? [];
    arr.push({ spend: Number(m.spend), revenue: Number(m.revenue), impressions: m.impressions, clicks: m.clicks });
    metricsIndex.set(m.creativeId, arr);
  }

  const bodyMap = new Map<string, { count: number; spend: number; revenue: number; impressions: number; clicks: number }>();
  for (const c of creativeRows) {
    if (!c.body) continue;
    const metrics = metricsIndex.get(c.id) ?? [];
    const existing = bodyMap.get(c.body) ?? { count: 0, spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    existing.count += 1;
    for (const m of metrics) {
      existing.spend += m.spend;
      existing.revenue += m.revenue;
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
    }
    bodyMap.set(c.body, existing);
  }

  const rows: TopCopyRow[] = Array.from(bodyMap.entries()).map(
    ([body, agg]) => ({
      body,
      adCount: agg.count,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    })
  );

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}
