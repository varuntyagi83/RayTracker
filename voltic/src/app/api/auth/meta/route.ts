import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Meta OAuth Initiation
 *
 * Constructs the Facebook OAuth URL and redirects the user to authorize.
 * Uses server route to avoid exposing META_APP_ID as a NEXT_PUBLIC_ env var.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.redirect(
      new URL("/settings?meta_error=no_workspace", request.url)
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  const metaAuthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  metaAuthUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  metaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  metaAuthUrl.searchParams.set(
    "scope",
    "ads_read,read_insights,pages_show_list"
  );
  metaAuthUrl.searchParams.set("state", member.workspace_id);
  metaAuthUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(metaAuthUrl.toString());
}
