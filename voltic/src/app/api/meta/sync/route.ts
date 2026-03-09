import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 2. Get workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  // Rate limit: 3 syncs per minute per workspace (each sync fans out to many Meta API calls)
  const rl = await apiLimiter.check(member.workspace_id, 3);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many sync requests — please wait before syncing again" }, { status: 429 });
  }

  const workspaceId = member.workspace_id;

  // 3. Get Meta access token
  const { data: workspace } = await admin
    .from("workspaces")
    .select("meta_access_token")
    .eq("id", workspaceId)
    .single();

  if (!workspace?.meta_access_token) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 400 });
  }

  // Decrypt token (handles both encrypted and legacy plaintext — M-27)
  const accessToken = decryptToken(workspace.meta_access_token);
  if (!accessToken) {
    return NextResponse.json({ error: "Meta token could not be read — please reconnect" }, { status: 500 });
  }

  // 4. Get all ad accounts for this workspace
  const { data: adAccounts } = await admin
    .from("ad_accounts")
    .select("id, meta_account_id")
    .eq("workspace_id", workspaceId);

  if (!adAccounts || adAccounts.length === 0) {
    return NextResponse.json(
      { error: "No ad accounts found. Try reconnecting Meta." },
      { status: 400 }
    );
  }

  // 5. Sync campaigns for each ad account
  let totalCampaigns = 0;
  const errors: string[] = [];

  for (const account of adAccounts) {
    try {
      const count = await syncCampaignsForAccount(
        admin,
        workspaceId,
        account.id,
        account.meta_account_id,
        accessToken
      );
      totalCampaigns += count;

      trackServer("meta_campaigns_synced", user.id, {
        workspace_id: workspaceId,
        ad_account_id: account.id,
        campaign_count: count,
      });

      // Update last_synced_at
      await admin
        .from("ad_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[meta-sync] Campaign sync failed for ${account.meta_account_id}:`,
        msg
      );
      errors.push(`${account.meta_account_id}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    synced_accounts: adAccounts.length,
    synced_campaigns: totalCampaigns,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ─── Campaign Sync ──────────────────────────────────────────────────────────

async function syncCampaignsForAccount(
  admin: ReturnType<typeof createAdminClient>,
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

  const campaigns: Array<{
    id: string;
    name: string;
    status: string;
    objective?: string;
    daily_budget?: string;
    lifetime_budget?: string;
  }> = campaignsData.data || [];

  for (const campaign of campaigns) {
    // Check if campaign already exists
    const { data: existingCampaign } = await admin
      .from("campaigns")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("meta_campaign_id", campaign.id)
      .single();

    let campaignDbId: string;

    if (existingCampaign) {
      campaignDbId = existingCampaign.id;
      await admin
        .from("campaigns")
        .update({
          name: campaign.name,
          status: campaign.status?.toLowerCase() || "unknown",
          objective: campaign.objective || null,
          daily_budget: parseBudgetCents(campaign.daily_budget),
          lifetime_budget: parseBudgetCents(campaign.lifetime_budget),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCampaign.id);
    } else {
      const { data: inserted } = await admin
        .from("campaigns")
        .insert({
          workspace_id: workspaceId,
          ad_account_id: adAccountDbId,
          meta_campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status?.toLowerCase() || "unknown",
          objective: campaign.objective || null,
          daily_budget: parseBudgetCents(campaign.daily_budget),
          lifetime_budget: parseBudgetCents(campaign.lifetime_budget),
        })
        .select("id")
        .single();

      if (!inserted) continue;
      campaignDbId = inserted.id;
    }

    // Fetch insights for last 7 days
    try {
      await syncCampaignMetrics(admin, campaignDbId, campaign.id, accessToken);
    } catch (err) {
      console.error(
        `[meta-sync] Metrics sync failed for campaign ${campaign.id}:`,
        err
      );
    }
  }

  return campaigns.length;
}

// ─── Metrics Sync ───────────────────────────────────────────────────────────

async function syncCampaignMetrics(
  admin: ReturnType<typeof createAdminClient>,
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

    // Upsert metric for this campaign + date
    const { data: existing } = await admin
      .from("campaign_metrics")
      .select("id")
      .eq("campaign_id", campaignDbId)
      .eq("date", day.date_start)
      .single();

    const metricData = {
      spend: spend.toFixed(2),
      revenue: revenue.toFixed(2),
      roas: roas.toFixed(4),
      impressions: parseInt(day.impressions || "0", 10),
      clicks: parseInt(day.clicks || "0", 10),
      ctr: parseFloat(day.ctr || "0").toFixed(4),
      purchases,
      landing_page_views: landingPageViews,
    };

    if (existing) {
      await admin
        .from("campaign_metrics")
        .update(metricData)
        .eq("id", existing.id);
    } else {
      await admin.from("campaign_metrics").insert({
        campaign_id: campaignDbId,
        date: day.date_start,
        ...metricData,
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
