/**
 * Automation Executor
 *
 * Orchestrates the full automation cycle:
 * 1. Load automation + workspace from DB
 * 2. Fetch data based on automation type
 * 3. Format data into Slack message using templates
 * 4. Send via Slack
 * 5. Record the run in automation_runs
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackMessage } from "@/lib/slack/client";
import type {
  Automation,
  PerformanceConfig,
  CompetitorConfig,
  CommentDigestConfig,
} from "@/types/automation";

// Templates
import {
  buildPerformanceDigest,
  type PerformanceRow,
} from "@/lib/slack/templates/performance-digest";
import { buildCompetitorReport } from "@/lib/slack/templates/competitor-report";
import { buildCommentDigest } from "@/lib/slack/templates/comment-digest";
import {
  buildLandingPageReport,
  type LandingPageRow,
} from "@/lib/slack/templates/landing-page-report";

// Data services
import { scrapeAdsLibrary } from "@/lib/meta/ads-library";
import { fetchPageComments } from "@/lib/meta/comments";
import {
  getTopCreatives,
  getTopHeadlines,
  getTopCopy,
  getTopLandingPages,
} from "@/lib/data/dashboard";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  runId?: string;
  itemsCount: number;
  error?: string;
  durationMs: number;
}

// ─── Main Executor ──────────────────────────────────────────────────────────

export async function executeAutomation(
  automationId: string,
  isTestRun = false
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const admin = createAdminClient();

  // 1. Load automation
  const { data: automation, error: loadError } = await admin
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (loadError || !automation) {
    return {
      success: false,
      itemsCount: 0,
      error: `Automation not found: ${loadError?.message ?? "unknown"}`,
      durationMs: Date.now() - startTime,
    };
  }

  const auto = automation as Automation;

  // 2. Load workspace for Slack token
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, slack_access_token, slack_team_name")
    .eq("id", auto.workspace_id)
    .single();

  const slackToken = workspace?.slack_access_token ?? process.env.SLACK_BOT_TOKEN;
  const channel = auto.delivery?.slackChannelId ?? "";

  if (!channel) {
    return await recordRun(admin, automationId, {
      success: false,
      itemsCount: 0,
      error: "No Slack channel configured",
      durationMs: Date.now() - startTime,
    });
  }

  // 3. Fetch data + format message based on type
  try {
    let itemsCount = 0;

    switch (auto.type) {
      case "performance": {
        const config = auto.config as PerformanceConfig;
        const message = await buildPerformanceMessage(
          auto,
          config,
          channel,
          isTestRun
        );
        itemsCount = message.itemsCount;
        const result = await sendSlackMessage(message.slackMessage);
        if (!result.ok) throw new Error(result.error ?? "Slack send failed");
        break;
      }

      case "competitor": {
        const config = auto.config as CompetitorConfig;
        const scrapeResult = await scrapeAdsLibrary({
          brandName: config.brandName,
          adsLibraryUrl: config.adsLibraryUrl || undefined,
          topN: config.scrapeSettings.topN,
          impressionPeriod: config.scrapeSettings.impressionPeriod,
          startedWithin: config.scrapeSettings.startedWithin,
        });
        itemsCount = scrapeResult.totalCount;
        const slackMessage = buildCompetitorReport(
          scrapeResult,
          auto.name,
          channel,
          isTestRun
        );
        const result = await sendSlackMessage(slackMessage);
        if (!result.ok) throw new Error(result.error ?? "Slack send failed");
        break;
      }

      case "comments": {
        const config = auto.config as CommentDigestConfig;
        const commentResult = await fetchPageComments({
          pages: config.pages.map((p) => ({
            pageId: p.pageId,
            pageName: p.pageName,
          })),
          postType: config.postFilters.postType,
          postAge: config.postFilters.postAge,
        });
        itemsCount = commentResult.totalCount;
        const slackMessage = buildCommentDigest(
          commentResult,
          auto.name,
          channel,
          isTestRun
        );
        const result = await sendSlackMessage(slackMessage);
        if (!result.ok) throw new Error(result.error ?? "Slack send failed");
        break;
      }

      default:
        throw new Error(`Unknown automation type: ${auto.type}`);
    }

    // 4. Update last_run_at
    await admin
      .from("automations")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", automationId);

    // 5. Record successful run
    return await recordRun(admin, automationId, {
      success: true,
      itemsCount,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[executor] Automation ${automationId} failed:`, msg);

    return await recordRun(admin, automationId, {
      success: false,
      itemsCount: 0,
      error: msg,
      durationMs: Date.now() - startTime,
    });
  }
}

// ─── Performance Data Builder ───────────────────────────────────────────────

async function buildPerformanceMessage(
  automation: Automation,
  config: PerformanceConfig,
  channel: string,
  isTestRun: boolean
) {
  const workspaceId = automation.workspace_id;
  let rows: PerformanceRow[] = [];

  switch (config.aggregation) {
    case "creatives": {
      const creatives = await getTopCreatives(workspaceId, 20);
      rows = creatives.map((c) => ({
        name: c.name,
        metrics: {
          roas: c.roas,
          spend: c.spend,
          impressions: c.impressions,
        },
      }));
      break;
    }
    case "headlines": {
      const headlines = await getTopHeadlines(workspaceId, 20);
      rows = headlines.map((h) => ({
        name: h.headline,
        metrics: {
          roas: h.roas,
          spend: h.spend,
          impressions: h.impressions,
        },
      }));
      break;
    }
    case "copy": {
      const copy = await getTopCopy(workspaceId, 20);
      rows = copy.map((c) => ({
        name: c.body.length > 60 ? c.body.slice(0, 57) + "..." : c.body,
        metrics: {
          roas: c.roas,
          spend: c.spend,
          impressions: c.impressions,
        },
      }));
      break;
    }
    case "landing_pages": {
      const pages = await getTopLandingPages(workspaceId, 20);
      const lpRows: LandingPageRow[] = pages.map((p) => ({
        landingPageUrl: p.landingPageUrl,
        roas: p.roas,
        spend: p.spend,
        impressions: p.impressions,
        ctr: p.ctr,
      }));

      // Use the dedicated landing page template
      const slackMessage = buildLandingPageReport(
        {
          automationName: automation.name,
          rows: lpRows,
          generatedAt: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
        channel,
        isTestRun
      );

      return { slackMessage, itemsCount: pages.length };
    }
    default: {
      // "campaigns" — use campaign metrics from DB
      const admin = createAdminClient();
      const { data: campaigns } = await admin
        .from("campaigns")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .limit(20);

      if (campaigns) {
        const campaignIds = campaigns.map((c) => c.id);
        const { data: metrics } = await admin
          .from("campaign_metrics")
          .select("campaign_id, spend, revenue, roas, impressions, purchases")
          .in("campaign_id", campaignIds)
          .eq("date", new Date().toISOString().split("T")[0]);

        const metricsMap = new Map<string, Record<string, number>>();
        for (const m of metrics ?? []) {
          metricsMap.set(m.campaign_id, {
            spend: Number(m.spend),
            revenue: Number(m.revenue),
            roas: Number(m.roas),
            impressions: m.impressions,
            purchases: m.purchases,
          });
        }

        rows = campaigns.map((c) => ({
          name: c.name,
          metrics: (metricsMap.get(c.id) ?? {}) as Partial<Record<string, number>>,
        }));
      }
      break;
    }
  }

  // Apply classification if enabled
  if (config.classification.enabled) {
    const sortMetric = config.sortBy.metric;
    for (const row of rows) {
      const val = row.metrics[sortMetric] ?? 0;
      if (val >= config.classification.topThreshold) {
        row.classification = "top";
      } else if (val <= config.classification.criticalThreshold) {
        row.classification = "critical";
      } else {
        row.classification = "normal";
      }
    }
  }

  // Sort rows
  const sortMetric = config.sortBy.metric;
  const sortDir = config.sortBy.direction === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const aVal = a.metrics[sortMetric] ?? 0;
    const bVal = b.metrics[sortMetric] ?? 0;
    return (bVal - aVal) * sortDir;
  });

  const slackMessage = buildPerformanceDigest(
    {
      automationName: automation.name,
      aggregation: config.aggregation,
      rows,
      config,
      generatedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    },
    channel,
    isTestRun
  );

  return { slackMessage, itemsCount: rows.length };
}

// ─── Run Recording ──────────────────────────────────────────────────────────

async function recordRun(
  admin: ReturnType<typeof createAdminClient>,
  automationId: string,
  result: Omit<ExecutionResult, "runId">
): Promise<ExecutionResult> {
  const { data: run } = await admin
    .from("automation_runs")
    .insert({
      automation_id: automationId,
      status: result.success ? "completed" : "failed",
      started_at: new Date(Date.now() - result.durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      items_count: result.itemsCount,
      error_message: result.error ?? null,
      metadata: { durationMs: result.durationMs },
    })
    .select("id")
    .single();

  return {
    ...result,
    runId: run?.id,
  };
}
