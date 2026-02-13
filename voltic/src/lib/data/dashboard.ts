import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KPIPeriod {
  revenue: number;
  spend: number;
  profit: number;
}

export interface WorkspaceKPIs {
  today: KPIPeriod;
  yesterday: KPIPeriod;
  last7Days: KPIPeriod;
  adAccountCount: number;
}

export interface TopCreative {
  id: string;
  name: string;
  imageUrl: string | null;
  format: string;
  roas: number;
  spend: number;
  impressions: number;
}

export interface TopHeadline {
  headline: string;
  roas: number;
  spend: number;
  impressions: number;
}

export interface TopCopy {
  body: string;
  roas: number;
  spend: number;
  impressions: number;
}

export interface TopLandingPage {
  landingPageUrl: string;
  roas: number;
  spend: number;
  impressions: number;
  ctr: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDateRanges() {
  const now = new Date();
  const today = formatDate(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDate(yesterdayDate);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 7);
  const last7 = formatDate(last7Start);

  return { today, yesterday, last7 };
}

// ─── Data Functions ──────────────────────────────────────────────────────────

export async function getWorkspaceKPIs(
  workspaceId: string
): Promise<WorkspaceKPIs> {
  const supabase = createAdminClient();
  const { today, yesterday, last7 } = getDateRanges();

  // Get ad account count
  const { count: adAccountCount } = await supabase
    .from("ad_accounts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  // Get campaign IDs for this workspace
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("workspace_id", workspaceId);

  const campaignIds = campaigns?.map((c) => c.id) ?? [];

  if (campaignIds.length === 0) {
    return {
      today: { revenue: 0, spend: 0, profit: 0 },
      yesterday: { revenue: 0, spend: 0, profit: 0 },
      last7Days: { revenue: 0, spend: 0, profit: 0 },
      adAccountCount: adAccountCount ?? 0,
    };
  }

  // Fetch all metrics for these campaigns in the last 7 days
  const { data: metrics } = await supabase
    .from("campaign_metrics")
    .select("campaign_id, date, spend, revenue")
    .in("campaign_id", campaignIds)
    .gte("date", last7)
    .lte("date", today);

  const rows = metrics ?? [];

  function sumPeriod(filterFn: (date: string) => boolean): KPIPeriod {
    let revenue = 0;
    let spend = 0;
    for (const row of rows) {
      if (filterFn(row.date)) {
        revenue += Number(row.revenue);
        spend += Number(row.spend);
      }
    }
    return { revenue, spend, profit: revenue - spend };
  }

  return {
    today: sumPeriod((d) => d === today),
    yesterday: sumPeriod((d) => d === yesterday),
    last7Days: sumPeriod((d) => d >= last7 && d <= today),
    adAccountCount: adAccountCount ?? 0,
  };
}

export async function getTopCreatives(
  workspaceId: string,
  limit = 10
): Promise<TopCreative[]> {
  const supabase = createAdminClient();
  const { last7, today } = getDateRanges();

  // Get creatives with their metrics aggregated over last 7 days
  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "id, name, image_url, format, creative_metrics(spend, revenue, roas, impressions, date)"
    )
    .eq("workspace_id", workspaceId)
    .limit(50);

  if (!creatives) return [];

  const result: TopCreative[] = creatives.map((c) => {
    const metrics = (
      c.creative_metrics as Array<{
        spend: string;
        revenue: string;
        roas: string;
        impressions: number;
        date: string;
      }>
    ).filter((m) => m.date >= last7 && m.date <= today);

    const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
    const totalRevenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    return {
      id: c.id,
      name: c.name,
      imageUrl: c.image_url,
      format: c.format,
      roas: avgRoas,
      spend: totalSpend,
      impressions: totalImpressions,
    };
  });

  return result.sort((a, b) => b.roas - a.roas).slice(0, limit);
}

export async function getTopHeadlines(
  workspaceId: string,
  limit = 10
): Promise<TopHeadline[]> {
  const supabase = createAdminClient();
  const { last7, today } = getDateRanges();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "headline, creative_metrics(spend, revenue, roas, impressions, date)"
    )
    .eq("workspace_id", workspaceId)
    .not("headline", "is", null)
    .limit(50);

  if (!creatives) return [];

  // Group by headline
  const headlineMap = new Map<
    string,
    { spend: number; revenue: number; impressions: number }
  >();

  for (const c of creatives) {
    if (!c.headline) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string;
        revenue: string;
        impressions: number;
        date: string;
      }>
    ).filter((m) => m.date >= last7 && m.date <= today);

    const existing = headlineMap.get(c.headline) ?? {
      spend: 0,
      revenue: 0,
      impressions: 0,
    };
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
      existing.impressions += m.impressions;
    }
    headlineMap.set(c.headline, existing);
  }

  const result: TopHeadline[] = Array.from(headlineMap.entries()).map(
    ([headline, agg]) => ({
      headline,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      spend: agg.spend,
      impressions: agg.impressions,
    })
  );

  return result.sort((a, b) => b.roas - a.roas).slice(0, limit);
}

export async function getTopCopy(
  workspaceId: string,
  limit = 10
): Promise<TopCopy[]> {
  const supabase = createAdminClient();
  const { last7, today } = getDateRanges();

  const { data: creatives } = await supabase
    .from("creatives")
    .select("body, creative_metrics(spend, revenue, roas, impressions, date)")
    .eq("workspace_id", workspaceId)
    .not("body", "is", null)
    .limit(50);

  if (!creatives) return [];

  const bodyMap = new Map<
    string,
    { spend: number; revenue: number; impressions: number }
  >();

  for (const c of creatives) {
    if (!c.body) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string;
        revenue: string;
        impressions: number;
        date: string;
      }>
    ).filter((m) => m.date >= last7 && m.date <= today);

    const existing = bodyMap.get(c.body) ?? {
      spend: 0,
      revenue: 0,
      impressions: 0,
    };
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
      existing.impressions += m.impressions;
    }
    bodyMap.set(c.body, existing);
  }

  const result: TopCopy[] = Array.from(bodyMap.entries()).map(
    ([body, agg]) => ({
      body,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      spend: agg.spend,
      impressions: agg.impressions,
    })
  );

  return result.sort((a, b) => b.roas - a.roas).slice(0, limit);
}

export async function getTopLandingPages(
  workspaceId: string,
  limit = 10
): Promise<TopLandingPage[]> {
  const supabase = createAdminClient();
  const { last7, today } = getDateRanges();

  const { data: creatives } = await supabase
    .from("creatives")
    .select(
      "landing_page_url, creative_metrics(spend, revenue, roas, impressions, clicks, ctr, date)"
    )
    .eq("workspace_id", workspaceId)
    .not("landing_page_url", "is", null)
    .limit(50);

  if (!creatives) return [];

  const lpMap = new Map<
    string,
    {
      spend: number;
      revenue: number;
      impressions: number;
      clicks: number;
    }
  >();

  for (const c of creatives) {
    if (!c.landing_page_url) continue;
    const metrics = (
      c.creative_metrics as Array<{
        spend: string;
        revenue: string;
        impressions: number;
        clicks: number;
        date: string;
      }>
    ).filter((m) => m.date >= last7 && m.date <= today);

    const existing = lpMap.get(c.landing_page_url) ?? {
      spend: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0,
    };
    for (const m of metrics) {
      existing.spend += Number(m.spend);
      existing.revenue += Number(m.revenue);
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
    }
    lpMap.set(c.landing_page_url, existing);
  }

  const result: TopLandingPage[] = Array.from(lpMap.entries()).map(
    ([landingPageUrl, agg]) => ({
      landingPageUrl,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
      spend: agg.spend,
      impressions: agg.impressions,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    })
  );

  return result.sort((a, b) => b.roas - a.roas).slice(0, limit);
}
