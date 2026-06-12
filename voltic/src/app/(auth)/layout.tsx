import type { ReactNode } from "react";
import { BarChart3, Zap, TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-zinc-950 p-14 relative overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        {/* Glows */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-emerald-600/6 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Zap className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">Voltic</span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Meta Ad Intelligence Platform</span>
            </div>
            <h1 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
              Turn competitor ads into your creative advantage
            </h1>
            <p className="text-zinc-400 text-[1.05rem] leading-relaxed max-w-md">
              Discover what's working in your market, generate AI-powered creative variations, and automate performance reporting — all in one workspace.
            </p>
          </div>

          <div className="space-y-4">
            <FeatureRow
              icon={BarChart3}
              title="Competitor intelligence"
              body="Track every ad your competitors run on Meta, broken down by format, copy, and creative."
            />
            <FeatureRow
              icon={Zap}
              title="AI creative variations"
              body="Generate on-brand ad variations from any competitor creative in seconds."
            />
            <FeatureRow
              icon={TrendingUp}
              title="Automated reporting"
              body="Push weekly performance summaries directly to your team's Slack channels."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["bg-emerald-500", "bg-teal-500", "bg-cyan-500"].map((c, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full ${c} border-2 border-zinc-950 flex items-center justify-center text-white text-[10px] font-bold`}
              >
                {["V", "A", "T"][i]}
              </div>
            ))}
          </div>
          <p className="text-zinc-500 text-sm">Trusted by growth teams at DTC brands worldwide</p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6 py-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none" />

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-xl tracking-tight">Voltic</span>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-zinc-200 text-sm font-medium">{title}</p>
        <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
