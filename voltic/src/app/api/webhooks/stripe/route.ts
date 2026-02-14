import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { addCredits } from "@/lib/data/credits";
import { trackServer } from "@/lib/analytics/posthog-server";

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
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify signature
  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata?.workspace_id || !metadata?.credits) {
        console.error("[stripe-webhook] Missing metadata on session", session.id);
        break;
      }

      const workspaceId = metadata.workspace_id;
      const credits = parseInt(metadata.credits, 10);
      const packageId = metadata.package_id || "unknown";
      const userId = metadata.user_id || "unknown";

      // Add credits to workspace
      const result = await addCredits(
        workspaceId,
        credits,
        "purchase",
        `Stripe purchase: ${credits} credits (${packageId} package)`
      );

      if (result.success) {
        trackServer("credits_purchased", userId, {
          package_id: packageId,
          credits,
          workspace_id: workspaceId,
          stripe_session_id: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
        });
        console.log(
          `[stripe-webhook] Added ${credits} credits to workspace ${workspaceId}`
        );
      } else {
        console.error(
          `[stripe-webhook] Failed to add credits:`,
          result.error
        );
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
