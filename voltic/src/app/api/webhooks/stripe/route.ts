import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { addCredits } from "@/lib/data/credits";
import { trackServer } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import { creditTransactions, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";

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
    // ── One-time credit purchases ────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata;

      // Subscription checkout — handled by customer.subscription.created
      if (session.mode === "subscription") break;

      if (!metadata?.workspace_id || !metadata?.credits) {
        console.error("[stripe-webhook] Missing metadata on checkout.session.completed", {
          session_id: session.id,
        });
        trackServer("stripe_webhook_missing_metadata", "system", { session_id: session.id, alert: true });
        break;
      }

      const workspaceId = metadata.workspace_id;
      const credits = parseInt(metadata.credits, 10);
      const packageId = metadata.package_id || "unknown";
      const userId = metadata.user_id || "unknown";

      if (!Number.isFinite(credits) || credits <= 0) break;

      const [existing] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.referenceId, session.id))
        .limit(1);

      if (existing) break;

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
      }
      break;
    }

    // ── Subscription created (trial starts) ──────────────────────────────────
    case "customer.subscription.created": {
      const sub = event.data.object;
      const meta = sub.metadata;
      const workspaceId = meta?.workspace_id;
      const planId = meta?.plan_id;
      const userId = meta?.user_id || "system";

      if (!workspaceId || !planId) {
        console.error("[stripe-webhook] Missing metadata on subscription.created", { sub_id: sub.id });
        break;
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

      await db
        .update(workspaces)
        .set({
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status as string,
          subscriptionPlan: planId,
          trialEndsAt: trialEnd,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));

      if (plan) {
        await addCredits(
          workspaceId,
          plan.credits,
          "welcome_bonus",
          `Trial started: ${plan.credits} credits for ${plan.name} plan`,
          sub.id
        );
      }

      trackServer("subscription_trial_started", userId, {
        workspace_id: workspaceId,
        plan_id: planId,
        trial_end: trialEnd?.toISOString(),
      });
      break;
    }

    // ── Subscription updated (status changes: trial→active, etc.) ────────────
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const workspaceId = sub.metadata?.workspace_id;
      if (!workspaceId) break;

      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

      await db
        .update(workspaces)
        .set({
          subscriptionStatus: sub.status as string,
          trialEndsAt: trialEnd,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));

      trackServer("subscription_updated", sub.metadata?.user_id || "system", {
        workspace_id: workspaceId,
        status: sub.status,
      });
      break;
    }

    // ── Subscription deleted (cancelled) ─────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const workspaceId = sub.metadata?.workspace_id;
      if (!workspaceId) break;

      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));

      trackServer("subscription_cancelled", sub.metadata?.user_id || "system", {
        workspace_id: workspaceId,
      });
      break;
    }

    // ── Invoice paid (monthly renewal — top up credits) ───────────────────────
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      if (invoice.billing_reason === "subscription_create") break; // first invoice during trial, skip

      const subRef = invoice.parent?.subscription_details?.subscription;
      const subId = typeof subRef === "string" ? subRef : (subRef as { id: string } | null)?.id;
      if (!subId) break;

      const [row] = await db
        .select({ id: workspaces.id, subscriptionPlan: workspaces.subscriptionPlan })
        .from(workspaces)
        .where(eq(workspaces.stripeSubscriptionId, subId))
        .limit(1);

      if (!row) break;

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === row.subscriptionPlan);
      if (!plan) break;

      await addCredits(
        row.id,
        plan.credits,
        "purchase",
        `Monthly renewal: ${plan.credits} credits for ${plan.name} plan`,
        invoice.id
      );

      await db
        .update(workspaces)
        .set({ subscriptionStatus: "active", updatedAt: new Date() })
        .where(eq(workspaces.id, row.id));

      trackServer("subscription_renewed", "system", {
        workspace_id: row.id,
        plan_id: plan.id,
        credits: plan.credits,
        invoice_id: invoice.id,
      });
      break;
    }

    // ── Invoice payment failed ─────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subRef2 = invoice.parent?.subscription_details?.subscription;
      const subId = typeof subRef2 === "string" ? subRef2 : (subRef2 as { id: string } | null)?.id;
      if (!subId) break;

      const [row] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.stripeSubscriptionId, subId))
        .limit(1);

      if (!row) break;

      await db
        .update(workspaces)
        .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
        .where(eq(workspaces.id, row.id));

      trackServer("subscription_payment_failed", "system", {
        workspace_id: row.id,
        invoice_id: invoice.id,
        alert: true,
      });
      break;
    }

    // ── Refund ────────────────────────────────────────────────────────────────
    case "charge.refunded": {
      const charge = event.data.object;
      console.warn("[stripe-webhook] charge.refunded — manual credit reversal required", {
        charge_id: charge.id,
        amount_refunded: charge.amount_refunded,
      });
      trackServer("stripe_refund_received", "system", {
        charge_id: charge.id,
        amount_refunded: charge.amount_refunded,
        alert: true,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
