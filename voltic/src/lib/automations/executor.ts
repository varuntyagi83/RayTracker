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

import { db } from "@/lib/db";
import {
  automations,
  workspaces,
  campaigns,
  campaignMetrics,
  automationRuns,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendSlackMessage } from "@/lib/slack/client";
import { decryptToken } from "@/lib/utils/token-crypto";
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

  // 1. Load automation
  const [automation] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, automationId))
    .limit(1);

  if (!automation) {
    return {
      success: false,
      itemsCount: 0,
      error: `Automation not found: ${automationId}`,
      durationMs: Date.now() - startTime,
    };
  }

  const auto = automation as unknown as Automation;

  // 2. Load workspace for Slack token
  const [workspace] = await db
    .select({
      id: workspaces.id,
      slackAccessToken: workspaces.slackAccessToken,
      slackTeamName: workspaces.slackTeamName,
    })
    .from(workspaces)
    .where(eq(workspaces.id, auto.workspace_id))
    .limit(1);

  // Decrypt Slack token (handles encrypted and legacy plaintext — M-27)
  const slackToken = decryptToken(workspace?.slackAccessToken ?? null);
  const channel = auto.delivery?.slackChannelId ?? "";

  if (!slackToken) {
    return await recordRun(automationId, {
      success: false,
      itemsCount: 0,
      error: "Slack not connected — please connect Slack in Settings",
      durationMs: Date.now() - startTime,
    });
  }

  if (!channel) {
    return await recordRun(automationId, {
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

        // Don't send an empty report — skip silently and record as success
        if (itemsCount === 0 && !isTestRun) {
          return await recordRun(automationId, {
            success: true,
            itemsCount: 0,
            error: undefined,
            durationMs: Date.now() - startTime,
          });
        }

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
          country: "ALL",
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
    await db
      .update(automations)
      .set({ lastRunAt: new Date() })
      .where(eq(automations.id, automationId));

    // 5. Record successful run
    return await recordRun(automationId, {
      success: true,
      itemsCount,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[executor] Automation ${automationId} failed:`, msg);

    return await recordRun(automationId, {
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
      const campaignRows = await db
        .select({ id: campaigns.id, name: campaigns.name })
        .from(campaigns)
        .where(eq(campaigns.workspaceId, workspaceId))
        .limit(20);

      if (campaignRows.length > 0) {
        const campaignIds = campaignRows.map((c) => c.id);
        const today = new Date().toISOString().split("T")[0];

        const metricsRows = await db
          .select({
            campaignId: campaignMetrics.campaignId,
            spend: campaignMetrics.spend,
            revenue: campaignMetrics.revenue,
            roas: campaignMetrics.roas,
            impressions: campaignMetrics.impressions,
            purchases: campaignMetrics.purchases,
          })
          .from(campaignMetrics)
          .where(
            and(
              inArray(campaignMetrics.campaignId, campaignIds),
              eq(campaignMetrics.date, today)
            )
          );

        const metricsMap = new Map<string, Record<string, number>>();
        for (const m of metricsRows) {
          metricsMap.set(m.campaignId, {
            spend: Number(m.spend),
            revenue: Number(m.revenue),
            roas: Number(m.roas),
            impressions: m.impressions,
            purchases: m.purchases,
          });
        }

        rows = campaignRows.map((c) => ({
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
  automationId: string,
  result: Omit<ExecutionResult, "runId">
): Promise<ExecutionResult> {
  const [run] = await db
    .insert(automationRuns)
    .values({
      automationId,
      status: result.success ? "completed" : "failed",
      startedAt: new Date(Date.now() - result.durationMs),
      completedAt: new Date(),
      itemsCount: result.itemsCount,
      errorMessage: result.error ?? null,
      metadata: { durationMs: result.durationMs },
    })
    .returning({ id: automationRuns.id });

  return {
    ...result,
    runId: run?.id,
  };
}
