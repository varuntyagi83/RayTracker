import { db } from "@/lib/db";
import {
  adAccounts,
  campaigns,
  campaignMetrics,
  creatives,
  creativeMetrics,
} from "@/db/schema";
import { eq, and, inArray, gte, lte, isNotNull, count } from "drizzle-orm";

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
  const { today, yesterday, last7 } = getDateRanges();

  // Get ad account count
  const [{ adAccountCount }] = await db
    .select({ adAccountCount: count() })
    .from(adAccounts)
    .where(eq(adAccounts.workspaceId, workspaceId));

  // Get campaign IDs for this workspace
  const campaignRows = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.workspaceId, workspaceId));

  const campaignIds = campaignRows.map((c) => c.id);

  if (campaignIds.length === 0) {
    return {
      today: { revenue: 0, spend: 0, profit: 0 },
      yesterday: { revenue: 0, spend: 0, profit: 0 },
      last7Days: { revenue: 0, spend: 0, profit: 0 },
      adAccountCount,
    };
  }

  // Fetch all metrics for these campaigns in the last 7 days
  const metrics = await db
    .select({
      date: campaignMetrics.date,
      spend: campaignMetrics.spend,
      revenue: campaignMetrics.revenue,
    })
    .from(campaignMetrics)
    .where(
      and(
        inArray(campaignMetrics.campaignId, campaignIds),
        gte(campaignMetrics.date, last7),
        lte(campaignMetrics.date, today)
      )
    );

  function sumPeriod(filterFn: (date: string) => boolean): KPIPeriod {
    let revenue = 0;
    let spend = 0;
    for (const row of metrics) {
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
    adAccountCount,
  };
}

export async function getTopCreatives(
  workspaceId: string,
  limit = 10
): Promise<TopCreative[]> {
  const { last7, today } = getDateRanges();

  // Fetch creatives and their metrics over last 7 days via join
  const rows = await db
    .select({
      id: creatives.id,
      name: creatives.name,
      imageUrl: creatives.imageUrl,
      format: creatives.format,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      date: creativeMetrics.date,
    })
    .from(creatives)
    .leftJoin(
      creativeMetrics,
      and(
        eq(creativeMetrics.creativeId, creatives.id),
        gte(creativeMetrics.date, last7),
        lte(creativeMetrics.date, today)
      )
    )
    .where(eq(creatives.workspaceId, workspaceId))
    .limit(50 * 30); // up to 50 creatives x 30 days of metrics

  // Group by creative
  const creativeMap = new Map<
    string,
    { name: string; imageUrl: string | null; format: string; spend: number; revenue: number; impressions: number }
  >();

  for (const row of rows) {
    const existing = creativeMap.get(row.id) ?? {
      name: row.name,
      imageUrl: row.imageUrl,
      format: row.format,
      spend: 0,
      revenue: 0,
      impressions: 0,
    };
    if (row.spend !== null) existing.spend += Number(row.spend);
    if (row.revenue !== null) existing.revenue += Number(row.revenue);
    if (row.impressions !== null) existing.impressions += row.impressions;
    creativeMap.set(row.id, existing);
  }

  const result: TopCreative[] = Array.from(creativeMap.entries()).map(([id, agg]) => ({
    id,
    name: agg.name,
    imageUrl: agg.imageUrl,
    format: agg.format,
    roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
    spend: agg.spend,
    impressions: agg.impressions,
  }));

  return result.sort((a, b) => b.roas - a.roas).slice(0, limit);
}

export async function getTopHeadlines(
  workspaceId: string,
  limit = 10
): Promise<TopHeadline[]> {
  const { last7, today } = getDateRanges();

  const rows = await db
    .select({
      headline: creatives.headline,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      date: creativeMetrics.date,
    })
    .from(creatives)
    .leftJoin(
      creativeMetrics,
      and(
        eq(creativeMetrics.creativeId, creatives.id),
        gte(creativeMetrics.date, last7),
        lte(creativeMetrics.date, today)
      )
    )
    .where(and(eq(creatives.workspaceId, workspaceId), isNotNull(creatives.headline)))
    .limit(50 * 30);

  // Group by headline
  const headlineMap = new Map<string, { spend: number; revenue: number; impressions: number }>();

  for (const row of rows) {
    if (!row.headline) continue;
    const existing = headlineMap.get(row.headline) ?? { spend: 0, revenue: 0, impressions: 0 };
    if (row.spend !== null) existing.spend += Number(row.spend);
    if (row.revenue !== null) existing.revenue += Number(row.revenue);
    if (row.impressions !== null) existing.impressions += row.impressions;
    headlineMap.set(row.headline, existing);
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
  const { last7, today } = getDateRanges();

  const rows = await db
    .select({
      body: creatives.body,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      date: creativeMetrics.date,
    })
    .from(creatives)
    .leftJoin(
      creativeMetrics,
      and(
        eq(creativeMetrics.creativeId, creatives.id),
        gte(creativeMetrics.date, last7),
        lte(creativeMetrics.date, today)
      )
    )
    .where(and(eq(creatives.workspaceId, workspaceId), isNotNull(creatives.body)))
    .limit(50 * 30);

  const bodyMap = new Map<string, { spend: number; revenue: number; impressions: number }>();

  for (const row of rows) {
    if (!row.body) continue;
    const existing = bodyMap.get(row.body) ?? { spend: 0, revenue: 0, impressions: 0 };
    if (row.spend !== null) existing.spend += Number(row.spend);
    if (row.revenue !== null) existing.revenue += Number(row.revenue);
    if (row.impressions !== null) existing.impressions += row.impressions;
    bodyMap.set(row.body, existing);
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
  const { last7, today } = getDateRanges();

  const rows = await db
    .select({
      landingPageUrl: creatives.landingPageUrl,
      spend: creativeMetrics.spend,
      revenue: creativeMetrics.revenue,
      impressions: creativeMetrics.impressions,
      clicks: creativeMetrics.clicks,
      date: creativeMetrics.date,
    })
    .from(creatives)
    .leftJoin(
      creativeMetrics,
      and(
        eq(creativeMetrics.creativeId, creatives.id),
        gte(creativeMetrics.date, last7),
        lte(creativeMetrics.date, today)
      )
    )
    .where(and(eq(creatives.workspaceId, workspaceId), isNotNull(creatives.landingPageUrl)))
    .limit(50 * 30);

  const lpMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number }>();

  for (const row of rows) {
    if (!row.landingPageUrl) continue;
    const existing = lpMap.get(row.landingPageUrl) ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    if (row.spend !== null) existing.spend += Number(row.spend);
    if (row.revenue !== null) existing.revenue += Number(row.revenue);
    if (row.impressions !== null) existing.impressions += row.impressions;
    if (row.clicks !== null) existing.clicks += row.clicks;
    lpMap.set(row.landingPageUrl, existing);
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
