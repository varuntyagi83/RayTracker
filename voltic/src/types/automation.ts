// ─── Automation Config Types ────────────────────────────────────────────────

export type AutomationType = "performance" | "competitor" | "comments";
export type AutomationStatus = "draft" | "active" | "paused";
export type AggregationLevel =
  | "campaigns"
  | "creatives"
  | "headlines"
  | "landing_pages"
  | "copy";
export type MetricKey =
  | "spend"
  | "roas"
  | "revenue"
  | "purchases"
  | "lp_views"
  | "impressions"
  | "ctr";
export type TimePeriod = "yesterday" | "today" | "last_7d";
export type SortDirection = "desc" | "asc";
export type Frequency = "daily" | "weekly";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface PerformanceConfig {
  aggregation: AggregationLevel;
  metrics: MetricKey[];
  timePeriods: TimePeriod[];
  sortBy: {
    metric: MetricKey;
    direction: SortDirection;
    period: TimePeriod;
  };
  classification: {
    enabled: boolean;
    criticalThreshold: number;
    topThreshold: number;
  };
  filters: {
    entity: EntityFilter[];
    metric: MetricFilter[];
  };
}

export interface EntityFilter {
  id: string;
  field: string;
  operator: "contains" | "equals" | "starts_with" | "not_contains";
  value: string;
}

export interface MetricFilter {
  id: string;
  metric: MetricKey;
  operator: "gt" | "lt" | "gte" | "lte" | "eq";
  value: number;
  period: TimePeriod;
}

export interface ScheduleConfig {
  frequency: Frequency;
  time: string; // HH:mm
  timezone: string;
  days: DayOfWeek[];
}

export interface DeliveryConfig {
  platform: "slack";
  slackChannelId?: string;
  slackChannelName?: string;
}

// ─── DB Row Type ────────────────────────────────────────────────────────────

export interface Automation {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  type: AutomationType;
  status: AutomationStatus;
  config: PerformanceConfig | CompetitorConfig | Record<string, unknown>;
  schedule: ScheduleConfig;
  delivery: DeliveryConfig;
  classification: { enabled: boolean } | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Competitor Config ──────────────────────────────────────────────────────

export type ImpressionPeriod = "last_7d" | "last_30d" | "last_90d" | "all_time";
export type StartedWithin = "last_7d" | "last_30d" | "last_90d" | "last_6m" | "last_1y";

export interface CompetitorConfig {
  brandName: string;
  adsLibraryUrl: string;
  scrapeSettings: {
    topN: number;
    impressionPeriod: ImpressionPeriod;
    startedWithin: StartedWithin;
  };
}

// ─── Wizard State ───────────────────────────────────────────────────────────

export interface PerformanceWizardState {
  name: string;
  description: string;
  config: PerformanceConfig;
  delivery: DeliveryConfig;
  schedule: ScheduleConfig;
}

export interface CompetitorWizardState {
  name: string;
  description: string;
  config: CompetitorConfig;
  delivery: DeliveryConfig;
  schedule: ScheduleConfig;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  aggregation: "campaigns",
  metrics: ["spend", "roas", "revenue"],
  timePeriods: ["yesterday"],
  sortBy: { metric: "roas", direction: "desc", period: "yesterday" },
  classification: { enabled: false, criticalThreshold: 0.8, topThreshold: 2.0 },
  filters: { entity: [], metric: [] },
};

export const DEFAULT_COMPETITOR_CONFIG: CompetitorConfig = {
  brandName: "",
  adsLibraryUrl: "",
  scrapeSettings: {
    topN: 10,
    impressionPeriod: "last_30d",
    startedWithin: "last_30d",
  },
};

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  frequency: "daily",
  time: "09:00",
  timezone: "UTC",
  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
};

export const DEFAULT_DELIVERY: DeliveryConfig = {
  platform: "slack",
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  spend: "Spend",
  roas: "ROAS",
  revenue: "Revenue",
  purchases: "Purchases",
  lp_views: "LP Views",
  impressions: "Impressions",
  ctr: "CTR",
};

export const AGGREGATION_LABELS: Record<AggregationLevel, string> = {
  campaigns: "Campaigns",
  creatives: "Creatives",
  headlines: "Headlines",
  landing_pages: "Landing Pages",
  copy: "Copy",
};

export const PERIOD_LABELS: Record<TimePeriod, string> = {
  yesterday: "Yesterday",
  today: "Today",
  last_7d: "Last 7 Days",
};

export const PERIOD_COLORS: Record<TimePeriod, string> = {
  yesterday: "bg-orange-100 text-orange-700",
  today: "bg-green-100 text-green-700",
  last_7d: "bg-teal-100 text-teal-700",
};

export const IMPRESSION_PERIOD_LABELS: Record<ImpressionPeriod, string> = {
  last_7d: "Last 7 days",
  last_30d: "Last 30 days",
  last_90d: "Last 90 days",
  all_time: "All time",
};

export const STARTED_WITHIN_LABELS: Record<StartedWithin, string> = {
  last_7d: "Last 7 days",
  last_30d: "Last 30 days",
  last_90d: "Last 90 days",
  last_6m: "Last 6 months",
  last_1y: "Last year",
};
