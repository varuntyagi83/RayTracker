import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SLACK_SCOPES = [
  "chat:write",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
].join(",");

/**
 * Slack OAuth Initiation
 *
 * Generates a random CSRF state token, stores it in an httpOnly cookie,
 * then redirects to Slack's OAuth authorization endpoint.
 * The callback route validates the state to prevent CSRF attacks.
 */
export async function GET(request: NextRequest) {
  // Must be authenticated to initiate OAuth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();

  // Store state in a short-lived httpOnly cookie for CSRF validation
  const cookieStore = await cookies();
  cookieStore.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: SLACK_SCOPES,
    redirect_uri: `${appUrl}/api/auth/slack/callback`,
    state,
  });

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}
