import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { trackServer } from "@/lib/analytics/posthog-server";

const META_API_VERSION = "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Meta OAuth Callback
 *
 * Exchanges the authorization code for a long-lived token,
 * stores it on the workspace, and syncs ad accounts + Facebook pages.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // workspace_id
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?meta_error=${error || "no_code"}`, request.url)
    );
  }

  // 1. Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();

  // 2. Verify state (workspace_id) belongs to user
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member || member.workspace_id !== state) {
    return NextResponse.redirect(
      new URL("/settings?meta_error=invalid_workspace", request.url)
    );
  }

  const workspaceId = member.workspace_id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  // 3. Exchange code for short-lived token
  const tokenRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
      })
  );
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    console.error("[meta-oauth] Token exchange failed:", tokenData.error);
    trackServer("meta_connect_failed", user.id, {
      error: tokenData.error.message || "token_exchange_failed",
    });
    return NextResponse.redirect(
      new URL(
        `/settings?meta_error=${encodeURIComponent(tokenData.error.message || "token_exchange")}`,
        request.url
      )
    );
  }

  // 4. Exchange short-lived for long-lived token (60 days)
  const longTokenRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: tokenData.access_token,
      })
  );
  const longTokenData = await longTokenRes.json();

  if (longTokenData.error) {
    console.error(
      "[meta-oauth] Long-lived token exchange failed:",
      longTokenData.error
    );
    trackServer("meta_connect_failed", user.id, {
      error: longTokenData.error.message || "long_token_exchange_failed",
    });
    return NextResponse.redirect(
      new URL("/settings?meta_error=long_token_failed", request.url)
    );
  }

  const longLivedToken = longTokenData.access_token;

  // 5. Store long-lived token on workspace
  const { error: updateError } = await admin
    .from("workspaces")
    .update({ meta_access_token: longLivedToken })
    .eq("id", workspaceId);

  if (updateError) {
    console.error("[meta-oauth] Failed to store token:", updateError);
    return NextResponse.redirect(
      new URL("/settings?meta_error=save_failed", request.url)
    );
  }

  // 6. Fetch and store ad accounts (non-fatal)
  let adAccountCount = 0;
  try {
    adAccountCount = await syncAdAccounts(admin, workspaceId, longLivedToken);
  } catch (err) {
    console.error("[meta-oauth] Ad account sync failed:", err);
  }

  // 7. Fetch and store Facebook pages (non-fatal)
  try {
    await syncFacebookPages(admin, workspaceId, longLivedToken);
  } catch (err) {
    console.error("[meta-oauth] Facebook pages sync failed:", err);
  }

  trackServer("meta_connected", user.id, {
    ad_account_count: adAccountCount,
  });

  return NextResponse.redirect(
    new URL("/settings?meta_connected=true", request.url)
  );
}

// ─── Ad Account Sync ────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, string> = {
  1: "active",
  2: "disabled",
  3: "unsettled",
  7: "pending_risk_review",
  8: "pending_settlement",
  9: "in_grace_period",
  100: "pending_closure",
  101: "closed",
};

async function syncAdAccounts(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  accessToken: string
): Promise<number> {
  const res = await fetch(
    `${META_GRAPH_BASE}/me/adaccounts?` +
      new URLSearchParams({
        fields: "name,currency,timezone_name,account_status",
        access_token: accessToken,
        limit: "100",
      })
  );
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  const accounts: Array<{
    id: string;
    name: string;
    currency: string;
    timezone_name: string;
    account_status: number;
  }> = data.data || [];

  for (const account of accounts) {
    await admin.from("ad_accounts").upsert(
      {
        workspace_id: workspaceId,
        meta_account_id: account.id,
        name: account.name || account.id,
        currency: account.currency || "USD",
        timezone: account.timezone_name || "UTC",
        status: STATUS_MAP[account.account_status] || "unknown",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "meta_account_id" }
    );
  }

  return accounts.length;
}

// ─── Facebook Pages Sync ────────────────────────────────────────────────────

async function syncFacebookPages(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(
    `${META_GRAPH_BASE}/me/accounts?` +
      new URLSearchParams({
        fields: "id,name,instagram_business_account{username}",
        access_token: accessToken,
        limit: "100",
      })
  );
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  const pages: Array<{
    id: string;
    name: string;
    instagram_business_account?: { username: string };
  }> = data.data || [];

  for (const page of pages) {
    const { data: existing } = await admin
      .from("facebook_pages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("page_id", page.id)
      .single();

    if (existing) {
      await admin
        .from("facebook_pages")
        .update({
          page_name: page.name,
          has_instagram: !!page.instagram_business_account,
          instagram_handle:
            page.instagram_business_account?.username || null,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("facebook_pages").insert({
        workspace_id: workspaceId,
        page_id: page.id,
        page_name: page.name,
        has_instagram: !!page.instagram_business_account,
        instagram_handle: page.instagram_business_account?.username || null,
      });
    }
  }
}
