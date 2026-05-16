import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  workspaceMembers,
  workspaces,
  adAccounts,
  campaigns,
  campaignMetrics,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { trackServer } from "@/lib/analytics/posthog-server";
import { apiLimiter } from "@/lib/utils/rate-limit";
import { decryptToken } from "@/lib/utils/token-crypto";

const META_API_VERSION = "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Meta Campaign + Metrics Sync
 *
 * Fetches campaigns and last-7-day insights for all connected ad accounts.
 * Called via "Sync Now" button in Settings.
 */
export async function POST() {
  // 1. Authenticate
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get workspace
  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  // Rate limit: 3 syncs per minute per workspace (each sync fans out to many Meta API calls)
  const rl = await apiLimiter.check(member.workspaceId, 3);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many sync requests — please wait before syncing again" }, { status: 429 });
  }

  const workspaceId = member.workspaceId;

  // 3. Get Meta access token
  const [workspace] = await db
    .select({ metaAccessToken: workspaces.metaAccessToken })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace?.metaAccessToken) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 400 });
  }

  // Decrypt token (handles both encrypted and legacy plaintext — M-27)
  const accessToken = decryptToken(workspace.metaAccessToken);
  if (!accessToken) {
    return NextResponse.json({ error: "Meta token could not be read — please reconnect" }, { status: 500 });
  }

  // 4. Get all ad accounts for this workspace
  const adAccountRows = await db
    .select({ id: adAccounts.id, metaAccountId: adAccounts.metaAccountId })
    .from(adAccounts)
    .where(eq(adAccounts.workspaceId, workspaceId));

  if (adAccountRows.length === 0) {
    return NextResponse.json(
      { error: "No ad accounts found. Try reconnecting Meta." },
      { status: 400 }
    );
  }

  // 5. Sync campaigns for each ad account
  let totalCampaigns = 0;
  const errors: string[] = [];

  for (const account of adAccountRows) {
    try {
      const count = await syncCampaignsForAccount(
        workspaceId,
        account.id,
        account.metaAccountId,
        accessToken
      );
      totalCampaigns += count;

      trackServer("meta_campaigns_synced", userId, {
        workspace_id: workspaceId,
        ad_account_id: account.id,
        campaign_count: count,
      });

      // Update last_synced_at
      await db
        .update(adAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(eq(adAccounts.id, account.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[meta-sync] Campaign sync failed for ${account.metaAccountId}:`,
        msg
      );
      errors.push(`${account.metaAccountId}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    synced_accounts: adAccountRows.length,
    synced_campaigns: totalCampaigns,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ─── Campaign Sync ──────────────────────────────────────────────────────────

async function syncCampaignsForAccount(
  workspaceId: string,
  adAccountDbId: string,
  metaAccountId: string,
  accessToken: string
): Promise<number> {
  const campaignsRes = await fetch(
    `${META_GRAPH_BASE}/${metaAccountId}/campaigns?` +
      new URLSearchParams({
        fields: "name,status,objective,daily_budget,lifetime_budget",
        access_token: accessToken,
        limit: "100",
      })
  );
  const campaignsData = await campaignsRes.json();

  if (campaignsData.error) throw new Error(campaignsData.error.message);

  const metaCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    objective?: string;
    daily_budget?: string;
    lifetime_budget?: string;
  }> = campaignsData.data || [];

  for (const campaign of metaCampaigns) {
    // Check if campaign already exists
    const [existingCampaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.workspaceId, workspaceId),
          eq(campaigns.metaCampaignId, campaign.id)
        )
      )
      .limit(1);

    let campaignDbId: string;

    if (existingCampaign) {
      campaignDbId = existingCampaign.id;
      await db
        .update(campaigns)
        .set({
          name: campaign.name,
          status: campaign.status?.toLowerCase() || "unknown",
          objective: campaign.objective || null,
          dailyBudget: parseBudgetCents(campaign.daily_budget),
          lifetimeBudget: parseBudgetCents(campaign.lifetime_budget),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, existingCampaign.id));
    } else {
      const [inserted] = await db
        .insert(campaigns)
        .values({
          workspaceId,
          adAccountId: adAccountDbId,
          metaCampaignId: campaign.id,
          name: campaign.name,
          status: campaign.status?.toLowerCase() || "unknown",
          objective: campaign.objective || null,
          dailyBudget: parseBudgetCents(campaign.daily_budget),
          lifetimeBudget: parseBudgetCents(campaign.lifetime_budget),
        })
        .returning({ id: campaigns.id });

      if (!inserted) continue;
      campaignDbId = inserted.id;
    }

    // Fetch insights for last 7 days
    try {
      await syncCampaignMetrics(campaignDbId, campaign.id, accessToken);
    } catch (err) {
      console.error(
        `[meta-sync] Metrics sync failed for campaign ${campaign.id}:`,
        err
      );
    }
  }

  return metaCampaigns.length;
}

// ─── Metrics Sync ───────────────────────────────────────────────────────────

async function syncCampaignMetrics(
  campaignDbId: string,
  metaCampaignId: string,
  accessToken: string
): Promise<void> {
  const insightsRes = await fetch(
    `${META_GRAPH_BASE}/${metaCampaignId}/insights?` +
      new URLSearchParams({
        fields: "spend,impressions,clicks,ctr,actions,action_values",
        time_range: JSON.stringify({
          since: getDateDaysAgo(7),
          until: getDateDaysAgo(0),
        }),
        time_increment: "1",
        access_token: accessToken,
        limit: "30",
      })
  );
  const insightsData = await insightsRes.json();

  if (insightsData.error || !insightsData.data) return;

  for (const day of insightsData.data) {
    const purchases = extractActionValue(day.actions, "purchase");
    const revenue = extractActionValue(day.action_values, "purchase");
    const spend = parseFloat(day.spend || "0");
    const roas = spend > 0 ? revenue / spend : 0;
    const landingPageViews = extractActionValue(
      day.actions,
      "landing_page_view"
    );

    const metricValues = {
      spend: spend.toFixed(2),
      revenue: revenue.toFixed(2),
      roas: roas.toFixed(4),
      impressions: parseInt(day.impressions || "0", 10),
      clicks: parseInt(day.clicks || "0", 10),
      ctr: parseFloat(day.ctr || "0").toFixed(4),
      purchases,
      landingPageViews,
    };

    // Upsert metric for this campaign + date
    const [existing] = await db
      .select({ id: campaignMetrics.id })
      .from(campaignMetrics)
      .where(
        and(
          eq(campaignMetrics.campaignId, campaignDbId),
          eq(campaignMetrics.date, day.date_start)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(campaignMetrics)
        .set(metricValues)
        .where(eq(campaignMetrics.id, existing.id));
    } else {
      await db.insert(campaignMetrics).values({
        campaignId: campaignDbId,
        date: day.date_start,
        ...metricValues,
      });
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a Meta budget value (returned in cents as a string) to a decimal string.
 *  Meta returns budgets as integer strings in the account currency's minor unit
 *  (e.g. "5000" = $50.00 USD). Always use radix 10 to avoid octal parsing on
 *  strings like "0800". Returns null for missing/invalid values.
 */
function parseBudgetCents(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cents = parseInt(raw, 10);
  if (isNaN(cents)) return null;
  return (cents / 100).toFixed(2);
}

function extractActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseFloat(action.value) : 0;
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
