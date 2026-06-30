import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/client";
import { getWorkspace } from "@/lib/supabase/queries";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  const [row] = await db
    .select({ stripeSubscriptionId: workspaces.stripeSubscriptionId })
    .from(workspaces)
    .where(eq(workspaces.id, workspace.id))
    .limit(1);

  if (!row?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  const stripe = getStripe();
  await stripe.subscriptions.cancel(row.stripeSubscriptionId);

  await db
    .update(workspaces)
    .set({ subscriptionStatus: "canceled", updatedAt: new Date() })
    .where(eq(workspaces.id, workspace.id));

  return NextResponse.json({ success: true });
}
