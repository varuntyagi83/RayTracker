import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase/queries";
import crypto from "crypto";

/**
 * Meta OAuth Initiation
 *
 * Constructs the Facebook OAuth URL and redirects the user to authorize.
 * Uses server route to avoid exposing META_APP_ID as a NEXT_PUBLIC_ env var.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.redirect(new URL("/settings?meta_error=no_workspace", request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  const metaAuthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  metaAuthUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  metaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  metaAuthUrl.searchParams.set("scope", "ads_read,read_insights,pages_show_list");
  const oauthState = crypto.randomUUID();
  metaAuthUrl.searchParams.set("state", oauthState);
  metaAuthUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(metaAuthUrl.toString());
  response.cookies.set("meta_oauth_state", oauthState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
