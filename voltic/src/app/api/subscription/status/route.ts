import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ status: null }, { status: 401 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ status: null });
  }

  const [row] = await db
    .select({
      subscriptionStatus: workspaces.subscriptionStatus,
      subscriptionPlan: workspaces.subscriptionPlan,
      trialEndsAt: workspaces.trialEndsAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspace.id))
    .limit(1);

  const status = row?.subscriptionStatus ?? null;

  const response = NextResponse.json({
    status,
    plan: row?.subscriptionPlan ?? null,
    trialEndsAt: row?.trialEndsAt ?? null,
  });

  // Set a short-lived cookie so middleware can gate access without a DB call on every request
  if (status) {
    response.cookies.set("voltic-sub-status", status, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300, // 5 minutes, refreshed on next dashboard load
      path: "/",
    });
  }

  return response;
}
