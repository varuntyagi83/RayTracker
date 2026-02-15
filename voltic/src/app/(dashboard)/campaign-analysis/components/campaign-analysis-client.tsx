"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  GitCompareArrows,
  X,
} from "lucide-react";
import CampaignCharts from "./campaign-charts";
import {
  fetchCampaignList,
  fetchCampaignDetail,
  fetchCampaignCreatives,
  fetchCampaignComparison,
  fetchFilterOptions,
} from "../actions";
import type {
  CampaignSummary,
  CampaignDetail,
  CampaignCreative,
  ComparisonData,
  DatePreset,
  ChartMetric,
  ChartType,
} from "@/types/campaign-analysis";
import { track } from "@/lib/analytics/events";
import {
  getDateRangeFromPreset,
  DATE_PRESET_LABELS,
} from "@/types/campaign-analysis";

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNumber(v: number) {
  return v.toLocaleString();
}
function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}
function fmtMultiplier(v: number) {
  return `${v.toFixed(2)}x`;
}

// ─── Status Badge Colors ────────────────────────────────────────────────────

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "archived":
    case "deleted":
      return "destructive";
    default:
      return "outline";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CampaignAnalysisClient() {
  // ─── List State ───────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7d");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [objectiveFilter, setObjectiveFilter] = useState("all");
  const [sortKey, setSortKey] = useState("spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // ─── Filter Options ───────────────────────────────────────────────────────
  const [statuses, setStatuses] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);

  // ─── Drill-Down State ─────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [creatives, setCreatives] = useState<CampaignCreative[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Chart State ──────────────────────────────────────────────────────────
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spend");
  const [chartType, setChartType] = useState<ChartType>("line");

  // ─── Comparison State ─────────────────────────────────────────────────────
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // ─── Debounce Search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Track Page View ─────────────────────────────────────────────────────
  useEffect(() => {
    track("campaign_analysis_viewed", { report_type: "campaign_analysis" });
  }, []);

  // ─── Fetch Filter Options ─────────────────────────────────────────────────
  useEffect(() => {
    fetchFilterOptions().then((result) => {
      if ("error" in result) return;
      setStatuses(result.statuses);
      setObjectives(result.objectives);
    });
  }, []);

  // ─── Fetch Campaign List ──────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const dateRange = getDateRangeFromPreset(datePreset);
    const result = await fetchCampaignList({
      dateRange,
      search: debouncedSearch || undefined,
      statusFilter,
      objectiveFilter,
      sortKey,
      sortDirection,
    });

    if ("error" in result) {
      setCampaigns([]);
      setTotalCount(0);
    } else {
      setCampaigns(result.campaigns);
      setTotalCount(result.totalCount);
    }
    setLoading(false);
  }, [datePreset, debouncedSearch, statusFilter, objectiveFilter, sortKey, sortDirection]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ─── Expand/Collapse Campaign ─────────────────────────────────────────────
  const toggleExpand = async (campaignId: string) => {
    if (expandedId === campaignId) {
      setExpandedId(null);
      setDetail(null);
      setCreatives([]);
      return;
    }

    setExpandedId(campaignId);
    setDetailLoading(true);

    const dateRange = getDateRangeFromPreset(datePreset);
    const [detailResult, creativesResult] = await Promise.all([
      fetchCampaignDetail({ campaignId, dateRange }),
      fetchCampaignCreatives({ campaignId, dateRange }),
    ]);

    if (!("error" in detailResult)) {
      setDetail(detailResult);
    }
    if (!("error" in creativesResult)) {
      setCreatives(creativesResult as CampaignCreative[]);
    }
    setDetailLoading(false);
  };

  // ─── Comparison Toggle ────────────────────────────────────────────────────
  const toggleComparisonSelect = (campaignId: string) => {
    setSelectedForComparison((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else if (next.size < 5) {
        next.add(campaignId);
      }
      return next;
    });
  };

  const runComparison = async () => {
    if (selectedForComparison.size < 2) return;
    setComparisonLoading(true);
    const dateRange = getDateRangeFromPreset(datePreset);
    const result = await fetchCampaignComparison({
      campaignIds: [...selectedForComparison],
      dateRange,
    });
    if (!("error" in result)) {
      setComparisonData(result);
    }
    setComparisonLoading(false);
  };

  const exitComparison = () => {
    setComparisonMode(false);
    setSelectedForComparison(new Set());
    setComparisonData(null);
  };

  // ─── Sort Handler ─────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    track("report_exported", { report_type: "campaign_analysis", format: "csv" });
    const headers = ["Name", "Status", "Objective", "Ad Account", "Spend", "Revenue", "ROAS", "Impressions", "Clicks", "CTR", "Purchases"];
    const escapeCsv = (val: string | number): string => {
      const s = String(val);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvRows = campaigns.map((c) => [
      c.name,
      c.status,
      c.objective ?? "",
      c.adAccountName,
      c.spend,
      c.revenue,
      c.roas.toFixed(2),
      c.impressions,
      c.clicks,
      c.ctr.toFixed(2),
      c.purchases,
    ]);
    const csv = [headers.join(","), ...csvRows.map((r) => r.map((v) => escapeCsv(v)).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaign-analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Sort Icon ────────────────────────────────────────────────────────────
  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  // ─── Column Defs ──────────────────────────────────────────────────────────
  const columns = [
    { key: "name", label: "Campaign", width: "250px" },
    { key: "status", label: "Status" },
    { key: "objective", label: "Objective" },
    { key: "spend", label: "Spend" },
    { key: "revenue", label: "Revenue" },
    { key: "roas", label: "ROAS" },
    { key: "impressions", label: "Impressions" },
    { key: "clicks", label: "Clicks" },
    { key: "ctr", label: "CTR" },
    { key: "purchases", label: "Purchases" },
  ];

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
  if (loading && campaigns.length === 0) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaign Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Deep-dive into campaign performance with charts, drill-down, and comparison mode.
          </p>
        </div>
      </div>

      {/* Comparison Mode Chart */}
      {comparisonData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              Comparing {comparisonData.campaigns.length} Campaigns
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={exitComparison}>
              <X className="mr-1 h-4 w-4" />
              Exit Comparison
            </Button>
          </CardHeader>
          <CardContent>
            {/* Comparison KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {comparisonData.campaigns.map((c, i) => (
                <div
                  key={c.id}
                  className="border rounded-lg p-3 space-y-1"
                  style={{ borderLeftColor: ["#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#9333ea"][i], borderLeftWidth: 4 }}
                >
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Spend</span><span className="text-right font-medium text-foreground">{fmtCurrency(c.totals.spend)}</span>
                    <span>Revenue</span><span className="text-right font-medium text-foreground">{fmtCurrency(c.totals.revenue)}</span>
                    <span>ROAS</span><span className="text-right font-medium text-foreground">{fmtMultiplier(c.totals.roas)}</span>
                    <span>CTR</span><span className="text-right font-medium text-foreground">{fmtPct(c.totals.ctr)}</span>
                  </div>
                </div>
              ))}
            </div>
            <CampaignCharts
              timeSeries={[]}
              selectedMetric={chartMetric}
              chartType={chartType}
              onMetricChange={setChartMetric}
              onChartTypeChange={setChartType}
              comparisonData={comparisonData.campaigns.map((c) => ({
                name: c.name,
                timeSeries: c.timeSeries,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Date Preset */}
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_PRESET_LABELS)
              .filter(([k]) => k !== "custom")
              .map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Objective Filter */}
        {objectives.length > 0 && (
          <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Objective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Objectives</SelectItem>
              {objectives.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Comparison Mode Toggle */}
        <Button
          variant={comparisonMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (comparisonMode) {
              exitComparison();
            } else {
              setComparisonMode(true);
              setExpandedId(null);
            }
          }}
        >
          <GitCompareArrows className="mr-2 h-4 w-4" />
          Compare
        </Button>

        {comparisonMode && selectedForComparison.size >= 2 && (
          <Button size="sm" onClick={runComparison} disabled={comparisonLoading}>
            {comparisonLoading ? "Loading..." : `Compare ${selectedForComparison.size}`}
          </Button>
        )}

        {/* Export CSV */}
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>

        {/* Count */}
        <span className="text-sm text-muted-foreground">{totalCount} campaigns</span>
      </div>

      {/* Campaign Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {comparisonMode && <TableHead className="w-[40px]" />}
              <TableHead className="w-[40px]" />
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer select-none"
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon column={col.key} />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (comparisonMode ? 2 : 1)}
                  className="text-center text-muted-foreground py-12"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  isExpanded={expandedId === campaign.id}
                  onToggleExpand={() => toggleExpand(campaign.id)}
                  detail={expandedId === campaign.id ? detail : null}
                  creatives={expandedId === campaign.id ? creatives : []}
                  detailLoading={expandedId === campaign.id && detailLoading}
                  comparisonMode={comparisonMode}
                  isSelected={selectedForComparison.has(campaign.id)}
                  onToggleSelect={() => toggleComparisonSelect(campaign.id)}
                  columnsCount={columns.length}
                  chartMetric={chartMetric}
                  chartType={chartType}
                  onChartMetricChange={setChartMetric}
                  onChartTypeChange={setChartType}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Campaign Row ───────────────────────────────────────────────────────────

interface CampaignRowProps {
  campaign: CampaignSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  detail: CampaignDetail | null;
  creatives: CampaignCreative[];
  detailLoading: boolean;
  comparisonMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  columnsCount: number;
  chartMetric: ChartMetric;
  chartType: ChartType;
  onChartMetricChange: (m: ChartMetric) => void;
  onChartTypeChange: (t: ChartType) => void;
}

function CampaignRow({
  campaign,
  isExpanded,
  onToggleExpand,
  detail,
  creatives,
  detailLoading,
  comparisonMode,
  isSelected,
  onToggleSelect,
  columnsCount,
  chartMetric,
  chartType,
  onChartMetricChange,
  onChartTypeChange,
}: CampaignRowProps) {
  const totalColSpan = columnsCount + (comparisonMode ? 2 : 1);

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? "bg-muted/30" : ""}`}
        onClick={() => !comparisonMode && onToggleExpand()}
      >
        {/* Comparison Checkbox */}
        {comparisonMode && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect()}
            />
          </TableCell>
        )}

        {/* Expand Arrow */}
        <TableCell>
          {!comparisonMode && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </TableCell>

        {/* Campaign Name */}
        <TableCell className="font-medium">{campaign.name}</TableCell>

        {/* Status */}
        <TableCell>
          <Badge variant={statusVariant(campaign.status)}>
            {campaign.status}
          </Badge>
        </TableCell>

        {/* Objective */}
        <TableCell className="text-muted-foreground">{campaign.objective ?? "—"}</TableCell>

        {/* Metrics */}
        <TableCell>{fmtCurrency(campaign.spend)}</TableCell>
        <TableCell>{fmtCurrency(campaign.revenue)}</TableCell>
        <TableCell>{fmtMultiplier(campaign.roas)}</TableCell>
        <TableCell>{fmtNumber(campaign.impressions)}</TableCell>
        <TableCell>{fmtNumber(campaign.clicks)}</TableCell>
        <TableCell>{fmtPct(campaign.ctr)}</TableCell>
        <TableCell>{fmtNumber(campaign.purchases)}</TableCell>
      </TableRow>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={totalColSpan} className="p-0">
            <div className="border-t bg-muted/10 p-6 space-y-6">
              {detailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-[300px] w-full" />
                  <Skeleton className="h-[200px] w-full" />
                </div>
              ) : detail ? (
                <>
                  {/* Campaign Info */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="text-lg font-semibold">{detail.name}</h3>
                    <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
                    {detail.objective && (
                      <Badge variant="outline">{detail.objective}</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Ad Account: {detail.adAccountName}
                    </span>
                    {detail.dailyBudget && (
                      <span className="text-sm text-muted-foreground">
                        Daily Budget: {fmtCurrency(detail.dailyBudget)}
                      </span>
                    )}
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { label: "Spend", value: fmtCurrency(detail.totals.spend) },
                      { label: "Revenue", value: fmtCurrency(detail.totals.revenue) },
                      { label: "ROAS", value: fmtMultiplier(detail.totals.roas) },
                      { label: "Impressions", value: fmtNumber(detail.totals.impressions) },
                      { label: "Clicks", value: fmtNumber(detail.totals.clicks) },
                      { label: "CTR", value: fmtPct(detail.totals.ctr) },
                      { label: "Purchases", value: fmtNumber(detail.totals.purchases) },
                    ].map((kpi) => (
                      <div key={kpi.label} className="border rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className="text-lg font-bold">{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Performance Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CampaignCharts
                        timeSeries={detail.timeSeries}
                        selectedMetric={chartMetric}
                        chartType={chartType}
                        onMetricChange={onChartMetricChange}
                        onChartTypeChange={onChartTypeChange}
                      />
                    </CardContent>
                  </Card>

                  {/* Creatives Drill-Down */}
                  {creatives.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Ads ({creatives.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead style={{ width: "200px" }}>Ad Name</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Spend</TableHead>
                                <TableHead>Revenue</TableHead>
                                <TableHead>ROAS</TableHead>
                                <TableHead>Impressions</TableHead>
                                <TableHead>CTR</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {creatives.map((creative) => (
                                <TableRow key={creative.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {creative.imageUrl && (
                                        <div className="relative w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden">
                                          <Image src={creative.imageUrl || "/placeholder.svg"} alt="" fill className="w-full h-full object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                                        </div>
                                      )}
                                      <span className="truncate max-w-[160px]">{creative.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{creative.format}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={statusVariant(creative.status)}>
                                      {creative.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{fmtCurrency(creative.spend)}</TableCell>
                                  <TableCell>{fmtCurrency(creative.revenue)}</TableCell>
                                  <TableCell>{fmtMultiplier(creative.roas)}</TableCell>
                                  <TableCell>{fmtNumber(creative.impressions)}</TableCell>
                                  <TableCell>{fmtPct(creative.ctr)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Failed to load campaign details.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
