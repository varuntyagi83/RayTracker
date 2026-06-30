"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CancelTrialModalProps {
  open: boolean;
  onClose: () => void;
  isTrial: boolean;
}

export function CancelTrialModal({ open, onClose, isTrial }: CancelTrialModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!open) return null;

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/subscription/cancelled");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">
          {isTrial ? "Cancel your free trial?" : "Cancel your subscription?"}
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          {isTrial
            ? "Your card will not be charged and access ends immediately. You can start a new trial anytime."
            : "Your subscription will be cancelled immediately. You will lose access to all features and your remaining credits."}
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Keep {isTrial ? "trial" : "subscription"}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
