"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { PlanId } from "@/types/subscription";

const PLANS = [
  {
    id: "solo" as PlanId,
    name: "Solo",
    price: 49,
    credits: 100,
    accounts: "3 ad accounts",
    seats: 1,
    popular: false,
    features: [
      "100 credits per month",
      "3 Meta ad accounts",
      "1 seat",
      "Competitor tracking",
      "AI creative variations",
      "Slack reports",
    ],
  },
  {
    id: "agency" as PlanId,
    name: "Agency",
    price: 149,
    credits: 300,
    accounts: "10 ad accounts",
    seats: 3,
    popular: true,
    features: [
      "300 credits per month",
      "10 Meta ad accounts",
      "3 seats",
      "Competitor tracking",
      "AI creative variations",
      "Slack reports",
      "Auto competitor reports",
      "Priority support",
    ],
  },
  {
    id: "scale" as PlanId,
    name: "Scale",
    price: 299,
    credits: 500,
    accounts: "Unlimited accounts",
    seats: 10,
    popular: false,
    features: [
      "500 credits per month",
      "Unlimited ad accounts",
      "10 seats",
      "Competitor tracking",
      "AI creative variations",
      "Slack reports",
      "Auto competitor reports",
      "Dedicated onboarding",
    ],
  },
];

export function PricingSection() {
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function startTrial(planId: PlanId) {
    setLoading(planId);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        // Not logged in — send to signup with plan param so we can redirect back
        window.location.href = `/signup?plan=${planId}`;
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Simple, usage-based plans
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Every plan includes a 7-day free trial. Card required at signup, nothing charged until day 8.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? "border-emerald-500 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <div className="mb-6">
                <p className="text-zinc-400 text-sm font-medium mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-zinc-500 text-sm">/month</span>
                </div>
                <p className="text-zinc-500 text-sm mt-2">
                  {plan.credits} credits/mo · {plan.accounts} · {plan.seats} {plan.seats === 1 ? "seat" : "seats"}
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startTrial(plan.id)}
                disabled={loading !== null}
                className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                {loading === plan.id ? "Redirecting..." : "Start free trial"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-zinc-600 text-sm">
          Need more credits? Add-on packs available at $29 per 100 credits.
          Enterprise pricing on request.
        </p>
      </div>
    </section>
  );
}
