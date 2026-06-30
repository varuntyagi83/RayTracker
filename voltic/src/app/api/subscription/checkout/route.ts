import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/client";
import { getWorkspace } from "@/lib/supabase/queries";
import { SUBSCRIPTION_PLANS, TRIAL_DAYS, type PlanId } from "@/types/subscription";
import { apiLimiter } from "@/lib/utils/rate-limit";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  planId: z.enum(["solo", "agency", "scale"]),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await apiLimiter.check(userId, 10);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === (parsed.data.planId as PlanId));
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Reuse existing Stripe customer if we have one
  const [row] = await db
    .select({ stripeCustomerId: workspaces.stripeCustomerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspace.id))
    .limit(1);

  const customerParams = row?.stripeCustomerId
    ? { customer: row.stripeCustomerId }
    : { customer_creation: "always" as const };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    ...customerParams,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        workspace_id: workspace.id,
        plan_id: plan.id,
        user_id: userId,
      },
    },
    metadata: {
      workspace_id: workspace.id,
      plan_id: plan.id,
      user_id: userId,
    },
    success_url: `${appUrl}/home?subscription=success`,
    cancel_url: `${appUrl}/?subscription=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
