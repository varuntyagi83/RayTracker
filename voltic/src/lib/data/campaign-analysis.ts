import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CampaignListParams,
  CampaignListResult,
  CampaignSummary,
  CampaignDetail,
  CampaignCreative,
  ComparisonData,
  MetricDataPoint,
  DateRange,
} from "@/types/campaign-analysis";

// ─── Campaign List ──────────────────────────────────────────────────────────

export async function getCampaignList(
  params: CampaignListParams
): Promise<CampaignListResult> {
  const supabase = createAdminClient();
  const { workspaceId, dateRange, search, statusFilter, objectiveFilter, sortKey, sortDirection } = params;

  // 1. Get campaigns for this workspace
  let query = supabase
    .from("campaigns")
    .select("id, name, status, objective, ad_account_id, ad_accounts(name)")
    .eq("workspace_id", workspaceId);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (objectiveFilter && objectiveFilter !== "all") {
    query = query.eq("objective", objectiveFilter);
  }

  const { data: campaigns } = await query;
  if (!campaigns || campaigns.length === 0) {
    return { campaigns: [], totalCount: 0 };
  }

  // 2. Get metrics for these campaigns within date range
  const campaignIds = campaigns.map((c) => c.id);
  const { data: metrics } = await supabase
    .from("campaign_metrics")
    .select("campaign_id, spend, revenue, impressions, clicks, purchases")
    .in("campaign_id", campaignIds)
    .gte("date", dateRange.from)
    .lte("date", dateRange.to);

  // 3. Aggregate metrics per campaign
  const metricsMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; purchases: number }>();
  for (const m of metrics ?? []) {
    const existing = metricsMap.get(m.campaign_id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    existing.spend += Number(m.spend);
    existing.revenue += Number(m.revenue);
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    existing.purchases += m.purchases;
    metricsMap.set(m.campaign_id, existing);
  }

  // 4. Build result
  const result: CampaignSummary[] = campaigns.map((c) => {
    const agg = metricsMap.get(c.id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    const adAccount = c.ad_accounts as unknown as { name: string } | null;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      adAccountName: adAccount?.name ?? "Unknown",
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      purchases: agg.purchases,
    };
  });

  // 5. Sort
  result.sort((a, b) => {
    const aVal = a[sortKey as keyof CampaignSummary] ?? 0;
    const bVal = b[sortKey as keyof CampaignSummary] ?? 0;
    const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
    return sortDirection === "asc" ? cmp : -cmp;
  });

  return { campaigns: result, totalCount: result.length };
}

// ─── Campaign Detail ────────────────────────────────────────────────────────

export async function getCampaignDetail(
  campaignId: string,
  workspaceId: string,
  dateRange: DateRange
): Promise<CampaignDetail | null> {
  const supabase = createAdminClient();

  // Get campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, objective, daily_budget, lifetime_budget, ad_account_id, ad_accounts(name)")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!campaign) return null;

  // Get daily metrics
  const { data: metrics } = await supabase
    .from("campaign_metrics")
    .select("date, spend, revenue, roas, impressions, clicks, ctr, purchases")
    .eq("campaign_id", campaignId)
    .gte("date", dateRange.from)
    .lte("date", dateRange.to)
    .order("date", { ascending: true });

  const rows = metrics ?? [];

  // Build time series
  const timeSeries: MetricDataPoint[] = rows.map((m) => ({
    date: m.date,
    spend: Number(m.spend),
    revenue: Number(m.revenue),
    roas: Number(m.roas),
    impressions: m.impressions,
    clicks: m.clicks,
    ctr: Number(m.ctr),
    purchases: m.purchases,
  }));

  // Compute totals
  const totals = {
    spend: 0,
    revenue: 0,
    roas: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    purchases: 0,
  };
  for (const dp of timeSeries) {
    totals.spend += dp.spend;
    totals.revenue += dp.revenue;
    totals.impressions += dp.impressions;
    totals.clicks += dp.clicks;
    totals.purchases += dp.purchases;
  }
  totals.roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const adAccount = campaign.ad_accounts as unknown as { name: string } | null;

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) : null,
    lifetimeBudget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) : null,
    adAccountName: adAccount?.name ?? "Unknown",
    totals,
    timeSeries,
  };
}

// ─── Campaign Creatives (Drill-Down) ────────────────────────────────────────

export async function getCampaignCreatives(
  campaignId: string,
  workspaceId: string,
  dateRange: DateRange
): Promise<CampaignCreative[]> {
  const supabase = createAdminClient();

  // Get creatives for this campaign
  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, name, headline, body, format, image_url, status")
    .eq("campaign_id", campaignId)
    .eq("workspace_id", workspaceId);

  if (!creatives || creatives.length === 0) return [];

  // Get metrics for these creatives
  const creativeIds = creatives.map((c) => c.id);
  const { data: metrics } = await supabase
    .from("creative_metrics")
    .select("creative_id, spend, revenue, impressions, clicks, purchases")
    .in("creative_id", creativeIds)
    .gte("date", dateRange.from)
    .lte("date", dateRange.to);

  // Aggregate
  const metricsMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; purchases: number }>();
  for (const m of metrics ?? []) {
    const existing = metricsMap.get(m.creative_id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    existing.spend += Number(m.spend);
    existing.revenue += Number(m.revenue);
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    existing.purchases += m.purchases;
    metricsMap.set(m.creative_id, existing);
  }

  return creatives.map((c) => {
    const agg = metricsMap.get(c.id) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 };
    return {
      id: c.id,
      name: c.name,
      headline: c.headline,
      body: c.body,
      format: c.format,
      imageUrl: c.image_url,
      status: c.status,
      spend: agg.spend,
      revenue: agg.revenue,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      purchases: agg.purchases,
    };
  }).sort((a, b) => b.spend - a.spend);
}

// ─── Comparison Data ────────────────────────────────────────────────────────

export async function getCampaignComparison(
  campaignIds: string[],
  workspaceId: string,
  dateRange: DateRange
): Promise<ComparisonData> {
  const results = await Promise.all(
    campaignIds.map((id) => getCampaignDetail(id, workspaceId, dateRange))
  );

  return {
    campaigns: results
      .filter((r): r is CampaignDetail => r !== null)
      .map((r) => ({
        id: r.id,
        name: r.name,
        timeSeries: r.timeSeries,
        totals: r.totals,
      })),
  };
}

// ─── Filter Options ─────────────────────────────────────────────────────────

export async function getCampaignFilterOptions(workspaceId: string) {
  const supabase = createAdminClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("status, objective")
    .eq("workspace_id", workspaceId);

  if (!campaigns) return { statuses: [], objectives: [] };

  const statuses = [...new Set(campaigns.map((c) => c.status))].sort();
  const objectives = [...new Set(campaigns.map((c) => c.objective).filter(Boolean) as string[])].sort();

  return { statuses, objectives };
}
