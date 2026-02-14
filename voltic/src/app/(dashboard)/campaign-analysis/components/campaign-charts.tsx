"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MetricDataPoint,
  ChartMetric,
  ChartType,
} from "@/types/campaign-analysis";
import { CHART_METRIC_LABELS, CHART_COLORS } from "@/types/campaign-analysis";

// ─── Props ──────────────────────────────────────────────────────────────────

interface CampaignChartsProps {
  timeSeries: MetricDataPoint[];
  selectedMetric: ChartMetric;
  chartType: ChartType;
  onMetricChange: (metric: ChartMetric) => void;
  onChartTypeChange: (type: ChartType) => void;
  comparisonData?: Array<{
    name: string;
    timeSeries: MetricDataPoint[];
  }>;
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function formatTickValue(value: number, metric: ChartMetric): string {
  if (metric === "spend" || metric === "revenue") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (metric === "roas") return `${value.toFixed(1)}x`;
  if (metric === "ctr") return `${value.toFixed(1)}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatTooltipValue(value: number, metric: ChartMetric): string {
  if (metric === "spend" || metric === "revenue") {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (metric === "roas") return `${value.toFixed(2)}x`;
  if (metric === "ctr") return `${value.toFixed(2)}%`;
  return value.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CampaignCharts({
  timeSeries,
  selectedMetric,
  chartType,
  onMetricChange,
  onChartTypeChange,
  comparisonData,
}: CampaignChartsProps) {
  const isComparison = comparisonData && comparisonData.length > 0;

  // Build chart data — merge all series by date for comparison mode
  const chartData = isComparison
    ? buildComparisonChartData(comparisonData, selectedMetric)
    : timeSeries.map((dp) => ({
        date: formatDate(dp.date),
        [selectedMetric]: dp[selectedMetric],
      }));

  const seriesKeys = isComparison
    ? comparisonData.map((c) => c.name)
    : [CHART_METRIC_LABELS[selectedMetric]];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedMetric} onValueChange={(v) => onMetricChange(v as ChartMetric)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CHART_METRIC_LABELS) as ChartMetric[]).map((m) => (
              <SelectItem key={m} value={m}>
                {CHART_METRIC_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={chartType} onValueChange={(v) => onChartTypeChange(v as ChartType)}>
          <TabsList>
            <TabsTrigger value="line">Line</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
            <TabsTrigger value="scatter">Scatter</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data for this period.
          </div>
        ) : chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatTickValue(v, selectedMetric)}
              />
              <Tooltip
                formatter={(value) => formatTooltipValue(Number(value ?? 0), selectedMetric)}
              />
              {seriesKeys.length > 1 && <Legend />}
              {seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : chartType === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatTickValue(v, selectedMetric)}
              />
              <Tooltip
                formatter={(value) => formatTooltipValue(Number(value ?? 0), selectedMetric)}
              />
              {seriesKeys.length > 1 && <Legend />}
              {seriesKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} name="Date" />
              <YAxis
                dataKey={seriesKeys[0]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatTickValue(v, selectedMetric)}
                name={CHART_METRIC_LABELS[selectedMetric]}
              />
              <Tooltip
                formatter={(value) => formatTooltipValue(Number(value ?? 0), selectedMetric)}
              />
              {seriesKeys.length > 1 && <Legend />}
              {seriesKeys.map((key, i) => (
                <Scatter
                  key={key}
                  name={key}
                  data={chartData}
                  dataKey={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Comparison Data Builder ────────────────────────────────────────────────

function buildComparisonChartData(
  series: Array<{ name: string; timeSeries: MetricDataPoint[] }>,
  metric: ChartMetric
) {
  // Collect all unique dates
  const dateSet = new Set<string>();
  for (const s of series) {
    for (const dp of s.timeSeries) {
      dateSet.add(dp.date);
    }
  }

  const dates = [...dateSet].sort();

  return dates.map((date) => {
    const point: Record<string, string | number> = { date: formatDate(date) };
    for (const s of series) {
      const dp = s.timeSeries.find((d) => d.date === date);
      point[s.name] = dp ? dp[metric] : 0;
    }
    return point;
  });
}
