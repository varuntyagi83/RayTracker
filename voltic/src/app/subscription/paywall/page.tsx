"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import type { PlanId } from "@/types/subscription";

const PLANS = [
  { id: "solo" as PlanId, name: "Solo", price: 49, popular: false },
  { id: "agency" as PlanId, name: "Agency", price: 149, popular: true },
  { id: "scale" as PlanId, name: "Scale", price: 299, popular: false },
];

export default function PaywallPage() {
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function resubscribe(planId: PlanId) {
    setLoading(planId);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Your access has ended</h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Your trial or subscription is no longer active. Choose a plan to get back in.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => resubscribe(plan.id)}
              disabled={loading !== null}
              className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
                plan.popular
                  ? "border-emerald-500 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"
              }`}
            >
              <p className="text-zinc-400 text-xs font-medium mb-1">{plan.name}</p>
              <p className="text-white font-bold text-lg">${plan.price}</p>
              <p className="text-zinc-500 text-xs">/month</p>
              {loading === plan.id && (
                <p className="text-emerald-400 text-xs mt-2">Redirecting...</p>
              )}
            </button>
          ))}
        </div>

        <p className="text-zinc-600 text-sm">
          Questions? Email <a href="mailto:hello@volticlens.com" className="text-zinc-400 underline">hello@volticlens.com</a>
        </p>
      </div>
    </div>
  );
}
