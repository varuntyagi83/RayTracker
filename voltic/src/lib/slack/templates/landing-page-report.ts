/**
 * Slack Template: Landing Page Report
 *
 * Renders top landing pages by ROAS with metrics per period.
 */

import type { SlackBlock, SlackMessage } from "@/lib/slack/client";
import {
  headerBlock,
  sectionBlock,
  fieldsBlock,
  dividerBlock,
  contextBlock,
} from "@/lib/slack/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LandingPageRow {
  landingPageUrl: string;
  roas: number;
  spend: number;
  impressions: number;
  ctr: number;
}

export interface LandingPageReportData {
  automationName: string;
  rows: LandingPageRow[];
  generatedAt: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export function buildLandingPageReport(
  data: LandingPageReportData,
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
      `:link: *Top Landing Pages* — ${data.rows.length} pages analyzed | ${data.generatedAt}`
    )
  );
  blocks.push(dividerBlock());

  // Column headers
  blocks.push(
    fieldsBlock(["*Landing Page*", "*ROAS*", "*Spend*", "*CTR*"])
  );

  // Rows (max 20)
  for (let i = 0; i < Math.min(data.rows.length, 20); i++) {
    const row = data.rows[i];
    const num = i + 1;

    const urlDisplay = shortenUrl(row.landingPageUrl, 50);

    blocks.push(
      sectionBlock(
        `*#${num}.* <${row.landingPageUrl}|${urlDisplay}>`
      )
    );
    blocks.push(
      fieldsBlock([
        `*ROAS:* ${row.roas.toFixed(2)}x`,
        `*Spend:* $${row.spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `*Impressions:* ${row.impressions.toLocaleString()}`,
        `*CTR:* ${row.ctr.toFixed(2)}%`,
      ])
    );

    if (i < data.rows.length - 1) {
      blocks.push(dividerBlock());
    }
  }

  // Footer
  blocks.push(dividerBlock());
  blocks.push(
    contextBlock(`:zap: Powered by Voltic | ${data.rows.length} landing pages`)
  );

  return {
    channel,
    text: `${prefix}${data.automationName} — ${data.rows.length} landing pages`,
    blocks,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortenUrl(url: string, maxLength: number): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    if (display.length <= maxLength) return display;
    return display.slice(0, maxLength - 3) + "...";
  } catch {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + "...";
  }
}
