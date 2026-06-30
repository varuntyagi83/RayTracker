import Link from "next/link";

export default function CancelledPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-white">Subscription cancelled</h1>
        <p className="text-zinc-400 leading-relaxed">
          Your subscription has been cancelled. Your card was not charged. You can restart a trial anytime.
        </p>
        <Link
          href="/#pricing"
          className="inline-block bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
