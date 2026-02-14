// ─── Campaign Analysis Types ─────────────────────────────────────────────────

import type { DateRange, DatePreset } from "./reports";

export type { DateRange, DatePreset };
export { getDateRangeFromPreset, DATE_PRESET_LABELS } from "./reports";

// ─── Campaign List ──────────────────────────────────────────────────────────

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  adAccountName: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
}

export interface CampaignListParams {
  workspaceId: string;
  dateRange: DateRange;
  search?: string;
  statusFilter?: string;
  objectiveFilter?: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
}

export interface CampaignListResult {
  campaigns: CampaignSummary[];
  totalCount: number;
}

// ─── Campaign Detail (Time Series) ─────────────────────────────────────────

export interface MetricDataPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
}

export interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  adAccountName: string;
  totals: {
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    ctr: number;
    purchases: number;
  };
  timeSeries: MetricDataPoint[];
}

// ─── Campaign Creatives (Drill-Down) ────────────────────────────────────────

export interface CampaignCreative {
  id: string;
  name: string;
  headline: string | null;
  body: string | null;
  format: string;
  imageUrl: string | null;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
}

// ─── Comparison Mode ────────────────────────────────────────────────────────

export interface ComparisonData {
  campaigns: Array<{
    id: string;
    name: string;
    timeSeries: MetricDataPoint[];
    totals: {
      spend: number;
      revenue: number;
      roas: number;
      impressions: number;
      clicks: number;
      ctr: number;
      purchases: number;
    };
  }>;
}

// ─── Chart Types ────────────────────────────────────────────────────────────

export type ChartMetric = "spend" | "revenue" | "roas" | "impressions" | "clicks" | "ctr" | "purchases";
export type ChartType = "line" | "bar" | "scatter";

export const CHART_METRIC_LABELS: Record<ChartMetric, string> = {
  spend: "Spend",
  revenue: "Revenue",
  roas: "ROAS",
  impressions: "Impressions",
  clicks: "Clicks",
  ctr: "CTR",
  purchases: "Purchases",
};

export const CHART_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#ca8a04", // yellow
  "#9333ea", // purple
  "#0891b2", // cyan
  "#ea580c", // orange
  "#be185d", // pink
];
