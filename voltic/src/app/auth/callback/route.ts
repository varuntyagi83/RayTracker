import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      // Get the authenticated user via Clerk after the code exchange
      const { userId } = await auth();

      if (userId) {
        // Check if this user already has a workspace
        const member = await db
          .select({ workspaceId: workspaceMembers.workspaceId })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId))
          .limit(1)
          .then((rows) => rows[0] ?? null);

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
