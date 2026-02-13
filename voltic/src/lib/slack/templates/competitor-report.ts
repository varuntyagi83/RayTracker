/**
 * Slack Template: Competitor Report
 *
 * Renders scraped competitor ads with numbered entries,
 * details, and "View in Ads Library" links.
 */

import type { SlackBlock, SlackMessage } from "@/lib/slack/client";
import {
  headerBlock,
  sectionBlock,
  fieldsBlock,
  dividerBlock,
  contextBlock,
  buttonBlock,
} from "@/lib/slack/client";
import type { AdsLibraryScrapeResult } from "@/lib/meta/ads-library";

// ─── Template ───────────────────────────────────────────────────────────────

export function buildCompetitorReport(
  data: AdsLibraryScrapeResult,
  automationName: string,
  channel: string,
  isTestRun = false
): SlackMessage {
  const prefix = isTestRun ? ":test_tube: TEST RUN — " : "";
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push(
    headerBlock(`${prefix}${automationName}`)
  );
  blocks.push(
    contextBlock(
      `:mag: *${data.brandName}* — ${data.totalCount} ads found | Scraped ${formatTimestamp(data.scrapedAt)}`
    )
  );
  blocks.push(dividerBlock());

  // Individual ads (max 15 to stay within Slack block limits)
  for (let i = 0; i < Math.min(data.ads.length, 15); i++) {
    const ad = data.ads[i];
    const num = i + 1;

    // Ad header with number
    blocks.push(
      sectionBlock(
        `*#${num}. ${ad.headline}*\n` +
        `${truncate(ad.bodyText, 150)}`
      )
    );

    // Details fields
    const details: string[] = [
      `*Format:* ${ad.mediaType}`,
      `*Started:* ${ad.startDate}`,
    ];
    if (ad.impressionRange) {
      details.push(
        `*Impressions:* ${ad.impressionRange.lower.toLocaleString()} — ${ad.impressionRange.upper.toLocaleString()}`
      );
    }
    if (ad.platforms.length > 0) {
      details.push(`*Platforms:* ${ad.platforms.join(", ")}`);
    }
    blocks.push(fieldsBlock(details));

    // View button
    blocks.push(
      buttonBlock("View in Ads Library", ad.adsLibraryUrl, `view_ad_${ad.id}`)
    );
    blocks.push(dividerBlock());
  }

  // Footer
  blocks.push(
    contextBlock(
      `:zap: Powered by Voltic | ${data.totalCount} total ads from ${data.brandName}`
    )
  );

  return {
    channel,
    text: `${prefix}${automationName} — ${data.totalCount} ads from ${data.brandName}`,
    blocks,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
