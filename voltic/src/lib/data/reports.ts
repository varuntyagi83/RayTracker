import { createAdminClient } from "@/lib/supabase/admin";
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
  const supabase = createAdminClient();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "id, name, headline, format, creative_metrics(spend, revenue, roas, impressions, clicks, ctr, purchases, date)"
    )
    .eq("workspace_id", params.workspaceId);

  if (!creatives) return paginate([], params.page, params.pageSize);

  const rows: TopAdRow[] = creatives.map((c) => {
    const metrics = (
      c.creative_metrics as Array<{
        spend: string; revenue: string; roas: string;
        impressions: number; clicks: number; ctr: string; purchases: number; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const spend = metrics.reduce((s, m) => s + Number(m.spend), 0);
    const revenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
    const impressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const purchases = metrics.reduce((s, m) => s + m.purchases, 0);

    return {
      id: c.id,
      name: c.name,
      headline: c.headline,
      format: c.format,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      purchases,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Campaigns ──────────────────────────────────────────────────────────

export async function getTopCampaignsReport(
  params: ReportParams
): Promise<ReportResult<TopCampaignRow>> {
  const supabase = createAdminClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, objective, campaign_metrics(spend, revenue, roas, impressions, clicks, ctr, purchases, date)"
    )
    .eq("workspace_id", params.workspaceId);

  if (!campaigns) return paginate([], params.page, params.pageSize);

  const rows: TopCampaignRow[] = campaigns.map((c) => {
    const metrics = (
      c.campaign_metrics as Array<{
        spend: string; revenue: string; roas: string;
        impressions: number; clicks: number; ctr: string; purchases: number; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const spend = metrics.reduce((s, m) => s + Number(m.spend), 0);
    const revenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
    const impressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const purchases = metrics.reduce((s, m) => s + m.purchases, 0);

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      purchases,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Creatives ──────────────────────────────────────────────────────────

export async function getTopCreativesReport(
  params: ReportParams
): Promise<ReportResult<TopCreativeRow>> {
  const supabase = createAdminClient();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "id, name, format, image_url, creative_metrics(spend, revenue, roas, impressions, clicks, ctr, date)"
    )
    .eq("workspace_id", params.workspaceId);

  if (!creatives) return paginate([], params.page, params.pageSize);

  const rows: TopCreativeRow[] = creatives.map((c) => {
    const metrics = (
      c.creative_metrics as Array<{
        spend: string; revenue: string; roas: string;
        impressions: number; clicks: number; ctr: string; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const spend = metrics.reduce((s, m) => s + Number(m.spend), 0);
    const revenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
    const impressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0);

    return {
      id: c.id,
      name: c.name,
      format: c.format,
      imageUrl: c.image_url,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    };
  });

  const sorted = sortRows(rows, params.sort.key, params.sort.direction);
  return paginate(sorted, params.page, params.pageSize);
}

// ─── Top Landing Pages ──────────────────────────────────────────────────────

export async function getTopLandingPagesReport(
  params: ReportParams
): Promise<ReportResult<TopLandingPageRow>> {
  const supabase = createAdminClient();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "landing_page_url, creative_metrics(spend, revenue, roas, impressions, clicks, ctr, date)"
    )
    .eq("workspace_id", params.workspaceId)
    .not("landing_page_url", "is", null);

  if (!creatives) return paginate([], params.page, params.pageSize);

  const lpMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number }>();

  for (const c of creatives) {
    if (!c.landing_page_url) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string; revenue: string; impressions: number; clicks: number; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const existing = lpMap.get(c.landing_page_url) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
    }
    lpMap.set(c.landing_page_url, existing);
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
  const supabase = createAdminClient();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "headline, creative_metrics(spend, revenue, impressions, clicks, date)"
    )
    .eq("workspace_id", params.workspaceId)
    .not("headline", "is", null);

  if (!creatives) return paginate([], params.page, params.pageSize);

  const headlineMap = new Map<string, { count: number; spend: number; revenue: number; impressions: number; clicks: number }>();

  for (const c of creatives) {
    if (!c.headline) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string; revenue: string; impressions: number; clicks: number; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const existing = headlineMap.get(c.headline) ?? { count: 0, spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    existing.count += 1;
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
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
  const supabase = createAdminClient();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "body, creative_metrics(spend, revenue, impressions, clicks, date)"
    )
    .eq("workspace_id", params.workspaceId)
    .not("body", "is", null);

  if (!creatives) return paginate([], params.page, params.pageSize);

  const bodyMap = new Map<string, { count: number; spend: number; revenue: number; impressions: number; clicks: number }>();

  for (const c of creatives) {
    if (!c.body) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string; revenue: string; impressions: number; clicks: number; date: string;
      }>
    ).filter((m) => m.date >= params.dateRange.from && m.date <= params.dateRange.to);

    const existing = bodyMap.get(c.body) ?? { count: 0, spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    existing.count += 1;
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
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
