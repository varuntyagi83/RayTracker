import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { addCredits } from "@/lib/data/credits";
import { trackServer } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import { creditTransactions } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. The main event we care about is
 * `checkout.session.completed` — when a credit purchase succeeds.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata?.workspace_id || !metadata?.credits) {
        console.error("[stripe-webhook] ALERT: Missing metadata on checkout.session.completed", {
          session_id: session.id,
          has_workspace_id: !!metadata?.workspace_id,
          has_credits: !!metadata?.credits,
        });
        trackServer("stripe_webhook_missing_metadata", "system", { session_id: session.id, alert: true });
        return NextResponse.json({ received: true });
      }

      const workspaceId = metadata.workspace_id;
      const credits = parseInt(metadata.credits, 10);
      const packageId = metadata.package_id || "unknown";
      const userId = metadata.user_id || "unknown";

      if (!Number.isFinite(credits) || credits <= 0) {
        console.error("[stripe-webhook] Invalid credits value in metadata:", {
          raw: metadata.credits,
          parsed: credits,
          session_id: session.id,
        });
        return NextResponse.json({ error: "Invalid credits metadata" }, { status: 400 });
      }

      // Idempotency guard: skip if this session was already processed.
      // reference_id is UUID in schema; use text cast to compare Stripe session IDs.
      const [existing] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(sql`${creditTransactions.referenceId}::text = ${session.id}`)
        .limit(1);

      if (existing) {
        break;
      }

      const result = await addCredits(
        workspaceId,
        credits,
        "purchase",
        `Stripe purchase: ${credits} credits (${packageId} package)`,
        session.id
      );

      if (result.success) {
        trackServer("credits_purchased", userId, {
          package_id: packageId,
          credits,
          workspace_id: workspaceId,
          stripe_session_id: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
        });
      } else {
        trackServer("credits_purchase_failed", userId, { workspace_id: workspaceId, error: result.error });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
