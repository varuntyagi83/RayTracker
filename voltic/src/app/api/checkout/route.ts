import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { CREDIT_PACKAGES } from "@/types/credits";
import { apiLimiter } from "@/lib/utils/rate-limit";

const checkoutSchema = z.object({
  packageId: z.enum(["starter", "pro", "enterprise"]),
});

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for purchasing credits.
 * Requires authentication. Stores workspace_id + package_id in metadata
 * so the webhook can credit the right workspace.
 */
export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit
  const rl = apiLimiter.check(user.id, 10);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 2. Get workspace
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  // 3. Validate body
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const pkg = CREDIT_PACKAGES.find((p) => p.id === parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  // 4. Create Stripe Checkout session
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pkg.credits} Voltic Credits`,
            description: `${pkg.id.charAt(0).toUpperCase() + pkg.id.slice(1)} credit package`,
          },
          unit_amount: Math.round(pkg.price * 100), // cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      workspace_id: member.workspace_id,
      user_id: user.id,
      package_id: pkg.id,
      credits: String(pkg.credits),
    },
    success_url: `${appUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/credits`,
  });

  return NextResponse.json({ url: session.url });
}
