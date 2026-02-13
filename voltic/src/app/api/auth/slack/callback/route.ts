import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Slack OAuth Callback
 *
 * Handles the OAuth redirect from Slack after a user authorizes the app.
 * Exchanges the code for an access token and stores it on the workspace.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/automations?slack_error=${error || "no_code"}`, request.url)
    );
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error("[slack-oauth] Token exchange failed:", tokenData.error);
    return NextResponse.redirect(
      new URL(`/automations?slack_error=${tokenData.error}`, request.url)
    );
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();

  // Find user's workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.redirect(
      new URL("/automations?slack_error=no_workspace", request.url)
    );
  }

  // Store Slack credentials on workspace
  const { error: updateError } = await admin
    .from("workspaces")
    .update({
      slack_team_id: tokenData.team?.id ?? null,
      slack_access_token: tokenData.access_token,
      slack_team_name: tokenData.team?.name ?? null,
    })
    .eq("id", member.workspace_id);

  if (updateError) {
    console.error("[slack-oauth] Failed to store token:", updateError);
    return NextResponse.redirect(
      new URL("/automations?slack_error=save_failed", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/automations?slack_connected=true", request.url)
  );
}
