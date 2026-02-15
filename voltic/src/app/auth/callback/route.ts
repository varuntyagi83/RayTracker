import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/home";
  // Prevent open redirect: only allow relative paths, block protocol-relative URLs
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/home";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Refresh session to ensure cookies are fully propagated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if this user already has a workspace
        const admin = createAdminClient();
        const { data: member } = await admin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();

        if (!member) {
          // New user confirmed email but has no workspace yet — send to signup
          const response = NextResponse.redirect(`${origin}/signup`);
          response.headers.set("Cache-Control", "no-store");
          return response;
        }
      }

      const response = NextResponse.redirect(`${origin}${next}`);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
