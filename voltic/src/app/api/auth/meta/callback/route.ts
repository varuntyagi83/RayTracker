import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { trackServer } from "@/lib/analytics/posthog-server";
import { encryptToken } from "@/lib/utils/token-crypto";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces, adAccounts, facebookPages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?meta_error=${error || "no_code"}`, request.url)
    );
  }

  // 1. Validate CSRF state nonce (M-25 fix — mirrors Slack OAuth pattern)
  const storedState = request.cookies.get("meta_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/settings?meta_error=invalid_state", request.url)
    );
  }

  // 2. Verify user is authenticated
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Get workspace from authenticated session
  const member = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!member) {
    return NextResponse.redirect(
      new URL("/settings?meta_error=invalid_workspace", request.url)
    );
  }

  const workspaceId = member.workspaceId;
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
    trackServer("meta_connect_failed", userId, {
      error: tokenData.error.message || "token_exchange_failed",
    });
    return NextResponse.redirect(
      new URL("/settings?meta_error=token_exchange", request.url)
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
    trackServer("meta_connect_failed", userId, {
      error: longTokenData.error.message || "long_token_exchange_failed",
    });
    return NextResponse.redirect(
      new URL("/settings?meta_error=long_token_failed", request.url)
    );
  }

  const longLivedToken = longTokenData.access_token;

  // 5. Store long-lived token on workspace (encrypted at rest — M-27)
  const updateResult = await db
    .update(workspaces)
    .set({ metaAccessToken: encryptToken(longLivedToken) })
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });

  if (!updateResult.length) {
    console.error("[meta-oauth] Failed to store token: no rows updated");
    return NextResponse.redirect(
      new URL("/settings?meta_error=save_failed", request.url)
    );
  }

  // 6. Fetch and store ad accounts (non-fatal)
  let adAccountCount = 0;
  try {
    adAccountCount = await syncAdAccounts(workspaceId, longLivedToken);
  } catch (err) {
    console.error("[meta-oauth] Ad account sync failed:", err);
  }

  // 7. Fetch and store Facebook pages (non-fatal)
  try {
    await syncFacebookPages(workspaceId, longLivedToken);
  } catch (err) {
    console.error("[meta-oauth] Facebook pages sync failed:", err);
  }

  trackServer("meta_connected", userId, {
    ad_account_count: adAccountCount,
  });

  const successResponse = NextResponse.redirect(
    new URL("/settings?meta_connected=true", request.url)
  );
  // Delete the CSRF state cookie now that it has been consumed (M-25)
  successResponse.cookies.delete("meta_oauth_state");
  return successResponse;
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
    await db
      .insert(adAccounts)
      .values({
        workspaceId,
        metaAccountId: account.id,
        name: account.name || account.id,
        currency: account.currency || "USD",
        timezone: account.timezone_name || "UTC",
        status: STATUS_MAP[account.account_status] || "unknown",
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adAccounts.metaAccountId,
        set: {
          name: account.name || account.id,
          currency: account.currency || "USD",
          timezone: account.timezone_name || "UTC",
          status: STATUS_MAP[account.account_status] || "unknown",
          lastSyncedAt: new Date(),
        },
      });
  }

  return accounts.length;
}

// ─── Facebook Pages Sync ────────────────────────────────────────────────────

async function syncFacebookPages(
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
    const existing = await db
      .select({ id: facebookPages.id })
      .from(facebookPages)
      .where(
        and(
          eq(facebookPages.workspaceId, workspaceId),
          eq(facebookPages.pageId, page.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (existing) {
      await db
        .update(facebookPages)
        .set({
          pageName: page.name,
          hasInstagram: !!page.instagram_business_account,
          instagramHandle: page.instagram_business_account?.username ?? null,
        })
        .where(eq(facebookPages.id, existing.id));
    } else {
      await db.insert(facebookPages).values({
        workspaceId,
        pageId: page.id,
        pageName: page.name,
        hasInstagram: !!page.instagram_business_account,
        instagramHandle: page.instagram_business_account?.username ?? null,
      });
    }
  }
}
