/**
 * Slack Template: Performance Digest
 *
 * Renders campaign/creative/headline performance data with
 * optional classification labels (Top/Normal/Critical).
 */

import type { SlackBlock, SlackMessage } from "@/lib/slack/client";
import {
  headerBlock,
  sectionBlock,
  fieldsBlock,
  dividerBlock,
  contextBlock,
} from "@/lib/slack/client";
import type { MetricKey, PerformanceConfig } from "@/types/automation";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PerformanceRow {
  name: string;
  classification?: "top" | "normal" | "critical";
  metrics: Partial<Record<MetricKey, number>>;
}

export interface PerformanceDigestData {
  automationName: string;
  aggregation: string;
  rows: PerformanceRow[];
  config: PerformanceConfig;
  generatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLASSIFICATION_EMOJI: Record<string, string> = {
  top: ":large_green_circle:",
  normal: ":large_yellow_circle:",
  critical: ":red_circle:",
};

const METRIC_FORMAT: Record<MetricKey, (v: number) => string> = {
  spend: (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  revenue: (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  roas: (v) => `${v.toFixed(2)}x`,
  purchases: (v) => v.toLocaleString(),
  lp_views: (v) => v.toLocaleString(),
  impressions: (v) => v.toLocaleString(),
  ctr: (v) => `${v.toFixed(2)}%`,
};

function formatMetric(key: MetricKey, value: number): string {
  return (METRIC_FORMAT[key] ?? ((v: number) => v.toString()))(value);
}

const METRIC_LABELS: Record<MetricKey, string> = {
  spend: "Spend",
  roas: "ROAS",
  revenue: "Revenue",
  purchases: "Purchases",
  lp_views: "LP Views",
  impressions: "Impressions",
  ctr: "CTR",
};

// ─── Template ───────────────────────────────────────────────────────────────

export function buildPerformanceDigest(
  data: PerformanceDigestData,
  channel: string,
  isTestRun = false
): SlackMessage {
  const prefix = isTestRun ? ":test_tube: TEST RUN — " : "";
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push(
    headerBlock(`${prefix}${data.automationName}`)
  );
  blocks.push(
    contextBlock(
      `*${data.aggregation}* performance digest | ${data.generatedAt}`
    )
  );
  blocks.push(dividerBlock());

  // Metric columns header
  const metricKeys = data.config.metrics;
  const headerFields = [
    `*Name*`,
    ...metricKeys.map((k) => `*${METRIC_LABELS[k]}*`),
  ];
  blocks.push(fieldsBlock(headerFields.slice(0, 10))); // Slack max 10 fields

  // Group rows by classification if enabled
  if (data.config.classification.enabled) {
    const groups = {
      top: data.rows.filter((r) => r.classification === "top"),
      normal: data.rows.filter((r) => r.classification === "normal"),
      critical: data.rows.filter((r) => r.classification === "critical"),
    };

    for (const [label, rows] of Object.entries(groups)) {
      if (rows.length === 0) continue;
      const emoji = CLASSIFICATION_EMOJI[label] || "";
      blocks.push(
        sectionBlock(`${emoji} *${label.charAt(0).toUpperCase() + label.slice(1)} Performers* (${rows.length})`)
      );
      for (const row of rows.slice(0, 10)) {
        blocks.push(buildRowBlock(row, metricKeys));
      }
      blocks.push(dividerBlock());
    }
  } else {
    // No classification — just list rows
    for (const row of data.rows.slice(0, 20)) {
      blocks.push(buildRowBlock(row, metricKeys));
    }
  }

  // Footer
  blocks.push(
    contextBlock(`:zap: Powered by Voltic | ${data.rows.length} ${data.aggregation} analyzed`)
  );

  return {
    channel,
    text: `${prefix}${data.automationName} — ${data.rows.length} ${data.aggregation}`,
    blocks,
  };
}

function buildRowBlock(row: PerformanceRow, metricKeys: MetricKey[]): SlackBlock {
  const values = metricKeys
    .map((k) => {
      const val = row.metrics[k];
      return val !== undefined ? formatMetric(k, val) : "—";
    })
    .join("  |  ");

  return sectionBlock(`*${row.name}*\n${values}`);
}
