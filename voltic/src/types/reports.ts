// ─── Report Types ───────────────────────────────────────────────────────────

export type ReportType =
  | "top-ads"
  | "top-campaigns"
  | "top-creatives"
  | "top-landing-pages"
  | "top-headlines"
  | "top-copy";

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T = Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  format?: "currency" | "number" | "percentage" | "multiplier" | "text" | "truncate";
  visible?: boolean;
  width?: string;
}

export interface ReportSort {
  key: string;
  direction: SortDirection;
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface ReportParams {
  workspaceId: string;
  dateRange: DateRange;
  sort: ReportSort;
  page: number;
  pageSize: number;
}

export interface ReportResult<T> {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Report Row Types ───────────────────────────────────────────────────────

export interface TopAdRow {
  [key: string]: unknown;
  id: string;
  name: string;
  headline: string | null;
  format: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
}

export interface TopCampaignRow {
  [key: string]: unknown;
  id: string;
  name: string;
  status: string;
  objective: string | null;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
}

export interface TopCreativeRow {
  [key: string]: unknown;
  id: string;
  name: string;
  format: string;
  imageUrl: string | null;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TopLandingPageRow {
  [key: string]: unknown;
  landingPageUrl: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TopHeadlineRow {
  [key: string]: unknown;
  headline: string;
  adCount: number;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TopCopyRow {
  [key: string]: unknown;
  body: string;
  adCount: number;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

// ─── Date Range Presets ─────────────────────────────────────────────────────

export type DatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "last_90d" | "custom";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7d: "Last 7 Days",
  last_30d: "Last 30 Days",
  last_90d: "Last 90 Days",
  custom: "Custom Range",
};

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: to, to };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      return { from: yStr, to: yStr };
    }
    case "last_7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split("T")[0], to };
    }
    case "last_30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split("T")[0], to };
    }
    case "last_90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { from: d.toISOString().split("T")[0], to };
    }
    case "custom":
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split("T")[0], to };
    }
  }
}
