import Link from "next/link";
import {
  Zap,
  BarChart3,
  ArrowRight,
  Check,
  Filter,
  Eye,
  Clock,
  Bell,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Stat = { value: string; label: string };
type Problem = { n: string; headline: string; body: string };
type FaqItem = { q: string; a: string };
type Plan = {
  name: string;
  price: number;
  credits: number;
  accounts: string;
  seats: number;
  features: string[];
  popular: boolean;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS: Stat[] = [
  { value: "2M+", label: "ads in the Meta library" },
  { value: "500+", label: "brands tracked" },
  { value: "12K+", label: "reports delivered to Slack" },
  { value: "8 hrs", label: "saved on reporting per week" },
];

const PROBLEMS: Problem[] = [
  {
    n: "01",
    headline: "You find out about a competitor shift when sales dip",
    body: "By the time you notice a change in the market, your competitor has already run 200 creative tests and found the ones that convert. You are three weeks behind.",
  },
  {
    n: "02",
    headline: "Your creative team spends weeks to ship three variations",
    body: "Brief, design, revisions, export. That cycle takes a month. Meanwhile the brands you compete with are shipping 40 variations and learning from every one.",
  },
  {
    n: "03",
    headline: "Someone exports spreadsheets every Friday afternoon",
    body: "Manual reporting is a tax on your team. One missed export and the weekly review has no data. Someone is always late. Someone always catches the error after the meeting.",
  },
];

const PLANS: Plan[] = [
  {
    name: "Solo",
    price: 49,
    credits: 100,
    accounts: "3 ad accounts",
    seats: 1,
    features: [
      "100 credits per month",
      "3 Meta ad accounts",
      "1 seat",
      "Competitor tracking",
      "AI creative variations",
      "Slack reports",
      "7-day free trial",
    ],
    popular: false,
  },
  {
    name: "Agency",
    price: 149,
    credits: 300,
    accounts: "10 ad accounts",
    seats: 3,
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
    popular: true,
  },
  {
    name: "Scale",
    price: 299,
    credits: 500,
    accounts: "Unlimited accounts",
    seats: 10,
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
    popular: false,
  },
];

const FAQS: FaqItem[] = [
  {
    q: "What data does Voltic pull from Meta?",
    a: "Voltic connects to the Meta Marketing API and the Meta Ads Library. You get campaign performance data from your own account and creative intelligence on any advertiser running public ads on Facebook or Instagram.",
  },
  {
    q: "How do the AI creative variations work?",
    a: "Upload a product image. Voltic generates new background scenes, angles, and ad formats using Gemini image models. Each variation comes with headlines and CTAs written in your brand voice by GPT-4o.",
  },
  {
    q: "What does the Slack integration send?",
    a: "A structured weekly summary: top campaigns by spend, creative fatigue alerts, competitor activity highlights, and anomalies in your account. You pick the schedule and the channel.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every new workspace gets 7 days of full access. No credit card required.",
  },
  {
    q: "How many ad accounts can I connect?",
    a: "One workspace supports up to 91 Meta ad accounts. If you manage multiple brands or client accounts, you can run them all from one place.",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative bg-zinc-950 text-zinc-100 min-h-screen overflow-x-hidden">
      {/* Subtle background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right,rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <Nav />
      <Hero />
      <StatsBar />
      <ProblemsSection />
      <CompetitorFeature />
      <VariationsFeature />
      <ReportingFeature />
      <HowItWorks />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Voltic</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-md shadow-emerald-500/20"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-20 pb-24 px-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium tracking-wider uppercase">
                Meta Ad Intelligence Platform
              </span>
            </div>

            <h1 className="text-5xl lg:text-[3.6rem] font-bold text-white leading-[1.1] tracking-tight">
              Your competitors
              <br />
              are testing on Meta
              <br />
              <span className="text-emerald-400">right now.</span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
              Voltic tracks every ad in the Meta library, generates on-brand
              creative variations from your product photos, and delivers weekly
              performance reports to your Slack channel. No manual work.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium px-6 py-3.5 rounded-xl transition-colors"
              >
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {["No credit card required", "7-day free trial", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

// ── Dashboard mockup ──────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-emerald-500/5 rounded-3xl blur-3xl pointer-events-none" />
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur overflow-hidden shadow-2xl shadow-black/60">
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-100">Competitor Ads</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">247 found</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />All formats
            </span>
            <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700 flex items-center gap-1.5">
              <Eye className="w-3 h-3" />Active
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3">
          <AdCard brand="Allbirds" logoColor="bg-emerald-700" format="Story" days={12} spend="$3.4K" active>
            <AllbirdsCreative />
          </AdCard>
          <AdCard brand="Gymshark" logoColor="bg-violet-700" format="Reel" days={5} spend="$8.1K" active>
            <GymsharkCreative />
          </AdCard>
          <AdCard brand="AG1" logoColor="bg-lime-700" format="Feed" days={21} spend="$14.2K" active>
            <AG1Creative />
          </AdCard>
          <AdCard brand="Allbirds" logoColor="bg-emerald-700" format="Feed" days={3} spend="$1.9K" active>
            <AllbirdsFeedCreative />
          </AdCard>
          <AdCard brand="Gymshark" logoColor="bg-violet-700" format="Story" days={8} spend="$5.7K" active={false}>
            <GymsharkStoryCreative />
          </AdCard>
          <AdCard brand="AG1" logoColor="bg-lime-700" format="Reel" days={30} spend="$22.0K" active={false}>
            <AG1ReelCreative />
          </AdCard>
        </div>

        <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between bg-zinc-900/40">
          <span className="text-xs text-zinc-600">Synced 4 min ago</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdCard({
  brand,
  logoColor,
  format,
  days,
  spend,
  active,
  children,
}: {
  brand: string;
  logoColor: string;
  format: string;
  days: number;
  spend: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-700/40 bg-zinc-800/40">
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-800/60">
        <div className={`w-4 h-4 rounded-full ${logoColor} flex items-center justify-center text-[7px] font-bold text-white shrink-0`}>
          {brand[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-zinc-300 leading-none">{brand}</p>
          <p className="text-[7px] text-zinc-600">Sponsored</p>
        </div>
        <span className={`text-[7px] px-1 py-0.5 rounded-full font-medium shrink-0 ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"}`}>
          {active ? "Active" : "Ended"}
        </span>
      </div>
      <div className="aspect-square relative overflow-hidden">{children}</div>
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-800/30 border-t border-zinc-700/20">
        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">{format}</span>
        <div className="flex items-center gap-1">
          <Clock className="w-2 h-2 text-zinc-600" />
          <span className="text-[8px] text-zinc-500">{days}d</span>
          <span className="text-zinc-700 mx-0.5">·</span>
          <span className="text-[8px] font-medium text-emerald-400">{spend}</span>
        </div>
      </div>
    </div>
  );
}

function SneakerSvg({ shoeColor = "white", accentColor = "#10b981" }: { shoeColor?: string; accentColor?: string }) {
  return (
    <svg viewBox="0 0 110 62" fill="none" className="w-[88%] h-auto drop-shadow-sm">
      <ellipse cx="56" cy="57" rx="46" ry="4" fill="rgba(0,0,0,0.12)" />
      <path d="M13,47 Q16,51 56,53 Q96,51 98,47" stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M14,44 Q56,49 98,44 L98,47 Q56,53 13,47 Z" fill="#d8d0c4" />
      <path d="M16,42 Q22,22 50,28 Q72,32 92,21 Q105,25 98,44 Z" fill={shoeColor} />
      <path d="M16,42 Q21,32 35,34 Q49,36 58,32" stroke="rgba(0,0,0,0.1)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M50,31 Q70,25 92,21" stroke="rgba(0,0,0,0.08)" strokeWidth="0.9" fill="none" />
      <path d="M48,35 Q68,29 90,25" stroke="rgba(0,0,0,0.08)" strokeWidth="0.9" fill="none" />
      <path d="M46,39 Q66,33 88,29" stroke="rgba(0,0,0,0.07)" strokeWidth="0.8" fill="none" />
      <path d="M92,21 Q105,25 98,44 Q94,33 88,27 Z" fill="rgba(0,0,0,0.07)" />
      <path d="M16,42 Q18,36 22,34" stroke="rgba(0,0,0,0.07)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M50,31 Q56,21 62,24 Q69,28 69,32" fill="rgba(0,0,0,0.05)" />
      <circle cx="78" cy="36" r="3.5" fill={accentColor} fillOpacity="0.15" />
      <circle cx="78" cy="36" r="2" fill={accentColor} fillOpacity="0.3" />
    </svg>
  );
}

function AllbirdsCreative() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-amber-50 flex flex-col items-center justify-between py-2 px-2">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600" />
      <div className="flex-1 flex items-center justify-center w-full">
        <SneakerSvg shoeColor="white" accentColor="#059669" />
      </div>
      <div className="w-full bg-gradient-to-t from-stone-700/65 to-transparent pt-5 pb-1.5 px-2">
        <p className="text-white text-[11px] font-bold leading-tight">Walk further. Feel better.</p>
        <div className="mt-1 inline-block bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded font-semibold">Shop Now</div>
      </div>
    </div>
  );
}

function GymsharkCreative() {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-28 h-28 rounded-full border border-violet-400" />
        <div className="absolute w-20 h-20 rounded-full border border-violet-400" />
        <div className="absolute w-12 h-12 rounded-full border border-violet-400" />
      </div>
      <div className="absolute top-1/2 left-0 right-0 h-px bg-violet-500/15" />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-violet-500/15" />
      <div className="relative z-10 text-center">
        <p className="text-white text-[14px] font-black uppercase tracking-widest leading-none">BUILT</p>
        <p className="text-violet-400 text-[14px] font-black uppercase tracking-widest">DIFFERENT</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-2 px-2.5">
        <p className="text-zinc-400 text-[9px]">New season. New limits.</p>
        <div className="mt-1 inline-block border border-violet-500/70 text-violet-300 text-[8px] px-2 py-0.5 rounded font-semibold">Shop Drop</div>
      </div>
    </div>
  );
}

function AG1Creative() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#1a3d20] to-[#0c1e0f] flex flex-col items-center justify-center gap-1.5 px-2">
      <svg viewBox="0 0 50 65" fill="none" className="w-[28%] h-auto">
        <rect x="8" y="18" width="34" height="40" rx="3" fill="#2a5c30" />
        <ellipse cx="25" cy="18" rx="17" ry="5" fill="#3a7040" />
        <ellipse cx="25" cy="58" rx="17" ry="5" fill="#163318" />
        <rect x="8" y="30" width="34" height="20" fill="white" fillOpacity="0.06" />
        <rect x="14" y="35" width="22" height="2.5" rx="1.25" fill="white" fillOpacity="0.75" />
        <rect x="17" y="40" width="16" height="1.8" rx="0.9" fill="#9fdc70" fillOpacity="0.6" />
        <path d="M8,18 Q8,12 25,12 Q42,12 42,18" stroke="#4a9050" strokeWidth="1.5" fill="none" />
      </svg>
      <div className="w-8 h-px bg-amber-400/50" />
      <p className="text-white text-[11px] font-bold text-center leading-tight">One habit. Better everything.</p>
      <p className="text-emerald-300 text-[9px] text-center">75 vitamins. One scoop.</p>
      <div className="bg-amber-400/90 text-zinc-900 text-[8px] px-2.5 py-0.5 rounded font-bold">Try AG1</div>
    </div>
  );
}

function AllbirdsFeedCreative() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-sky-50 flex flex-col items-center justify-between py-2 px-2">
      <div className="flex-1 flex items-center justify-center w-full">
        <SneakerSvg shoeColor="#ddeeff" accentColor="#0ea5e9" />
      </div>
      <div className="w-full bg-gradient-to-t from-sky-800/60 to-transparent pt-5 pb-1.5 px-2">
        <p className="text-white text-[11px] font-bold leading-tight">Sustainable style.</p>
        <div className="mt-1 inline-block bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded font-semibold">Find your fit</div>
      </div>
    </div>
  );
}

function GymsharkStoryCreative() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-violet-950 flex flex-col justify-between p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-violet-400 text-[8px] font-black uppercase tracking-widest">Gymshark</span>
        <div className="w-3.5 h-3.5 rounded-full border border-violet-500/40" />
      </div>
      <div className="flex items-center justify-center flex-1">
        <svg viewBox="0 0 60 80" fill="none" className="h-2/3">
          <circle cx="30" cy="11" r="6.5" fill="rgba(167,139,250,0.25)" />
          <path d="M21,20 L30,50 L39,20" stroke="rgba(167,139,250,0.45)" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M17,30 L30,38 L43,30" stroke="rgba(167,139,250,0.35)" strokeWidth="1.5" fill="none" />
          <path d="M23,50 L19,70" stroke="rgba(167,139,250,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M37,50 L41,70" stroke="rgba(167,139,250,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-white text-[12px] font-black uppercase leading-none">LEVEL</p>
        <p className="text-violet-400 text-[12px] font-black uppercase">UP.</p>
        <div className="mt-1 inline-block border border-violet-400/60 text-violet-300 text-[8px] px-2 py-0.5 rounded font-semibold">Shop Now</div>
      </div>
    </div>
  );
}

function AG1ReelCreative() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#1c3520] to-[#0a1a0c] flex flex-col justify-between p-2.5">
      <div className="flex justify-center">
        <div className="w-9 h-9 rounded-full bg-amber-400/12 border border-amber-400/25 flex items-center justify-center">
          <div className="w-4.5 h-4.5 rounded-full bg-amber-400/35" />
        </div>
      </div>
      <div className="w-full h-px bg-emerald-500/20" />
      <div>
        <p className="text-zinc-500 text-[8px] uppercase tracking-widest mb-1">Daily ritual</p>
        <p className="text-white text-[11px] font-bold leading-tight">Your one daily non-negotiable.</p>
        <p className="text-emerald-300 text-[9px] mt-1">75 vitamins. One scoop.</p>
        <div className="mt-1.5 inline-block bg-emerald-600/80 text-white text-[8px] px-2.5 py-0.5 rounded font-semibold">Start today</div>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/30">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-zinc-800">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center md:px-8">
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-sm text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Problems ──────────────────────────────────────────────────────────────────

function ProblemsSection() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 space-y-4">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            The old way
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white max-w-2xl leading-tight">
            Three things that slow every performance team down
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PROBLEMS.map(({ n, headline, body }) => (
            <div
              key={n}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-4"
            >
              <span className="text-5xl font-bold text-zinc-800">{n}</span>
              <h3 className="text-[1.05rem] font-semibold text-white leading-snug">{headline}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Competitor Intelligence ───────────────────────────────────────────────────

function CompetitorFeature() {
  const rows = [
    {
      brand: "Gymshark",
      copy: "Train harder. Recover faster.",
      format: "Reel",
      age: "14d",
      spend: "$12.1K",
    },
    {
      brand: "AG1",
      copy: "One scoop. Everything your body needs.",
      format: "Story",
      age: "30d",
      spend: "$28.4K",
    },
    {
      brand: "Allbirds",
      copy: "Comfortable all day. Built to last.",
      format: "Feed",
      age: "7d",
      spend: "$5.8K",
    },
    {
      brand: "Gymshark",
      copy: "New season, new personal best.",
      format: "Feed",
      age: "3d",
      spend: "$2.3K",
    },
  ];

  return (
    <section className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            Competitor intelligence
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Every ad your competitors run on Meta. All in one place.
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            Voltic pulls from the Meta Ads Library and surfaces every active
            campaign from the brands you track. Filter by format, duration, and
            estimated spend. Save anything to a board.
          </p>
          <ul className="space-y-3">
            {[
              "Facebook, Instagram, Reels, and Stories all covered",
              "Filter by format, language, and run duration",
              "Track spend estimates to gauge competitor investment",
              "Save ads to boards for creative research",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
          >
            Track your competitors
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-emerald-500/4 rounded-3xl blur-2xl pointer-events-none" />
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xl">
            <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2 bg-zinc-900/60">
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <span className="ml-2 text-xs text-zinc-500">Discover / Competitor Ads</span>
            </div>
            <div className="p-4 space-y-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:border-zinc-600/60 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-700/60 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200">{row.brand}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{row.copy}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                      {row.format}
                    </span>
                    <span className="text-[10px] text-zinc-500">{row.age}</span>
                    <span className="text-[10px] font-medium text-emerald-400">{row.spend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── AI Variations ─────────────────────────────────────────────────────────────

function VariationsFeature() {
  return (
    <section className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-20 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -inset-6 bg-emerald-500/4 rounded-3xl blur-2xl pointer-events-none" />
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xl">
            <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2 bg-zinc-900/60">
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <span className="ml-2 text-xs text-zinc-500">Creative Studio / Variations</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-stretch gap-4">
                {/* Source photo: actual product */}
                <div className="w-28 shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Source photo
                  </p>
                  <div className="aspect-square rounded-xl bg-gradient-to-b from-stone-100 to-stone-50 border border-zinc-600 flex items-center justify-center overflow-hidden">
                    <SneakerSvg shoeColor="white" accentColor="#059669" />
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-px bg-emerald-500/40" />
                    <span className="text-[9px] text-emerald-400 font-medium uppercase tracking-wider">
                      60s
                    </span>
                    <div className="w-10 h-px bg-emerald-500/40" />
                  </div>
                </div>

                {/* Variation outputs */}
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Variations generated
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* V1: Minimal product hero — white bg, large centered shoe, spec text */}
                    <div className="aspect-square rounded-xl overflow-hidden relative border border-zinc-300/20 bg-white flex flex-col">
                      <div className="flex-1 flex items-center justify-center px-1 pt-2">
                        <SneakerSvg shoeColor="white" accentColor="#059669" />
                      </div>
                      <div className="bg-white px-2 pb-2">
                        <p className="text-zinc-800 text-[9px] font-bold leading-none">Natural Wool.</p>
                        <p className="text-zinc-400 text-[8px] leading-tight">Zero Plastic Soles.</p>
                        <div className="mt-1 inline-block bg-zinc-900 text-white text-[7px] px-1.5 py-0.5 rounded font-semibold">Shop Now</div>
                      </div>
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center">
                        <Check className="w-2 h-2 text-emerald-400" />
                      </div>
                    </div>

                    {/* V2: Bold typographic — huge copy fills frame, shoe tiny */}
                    <div className="aspect-square rounded-xl overflow-hidden relative border border-zinc-700 bg-zinc-950 flex flex-col justify-between p-2">
                      <div>
                        <p className="text-white text-[16px] font-black uppercase leading-none tracking-tight">WALK</p>
                        <p className="text-emerald-400 text-[16px] font-black uppercase leading-none tracking-tight">FURTHER.</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-zinc-500 text-[8px] leading-tight max-w-[55%]">Merino wool. All-day comfort.</p>
                        <div className="w-10 opacity-40">
                          <SneakerSvg shoeColor="white" accentColor="#10b981" />
                        </div>
                      </div>
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center">
                        <Check className="w-2 h-2 text-emerald-400" />
                      </div>
                    </div>

                    {/* V3: Social proof — stars + testimonial quote */}
                    <div className="aspect-square rounded-xl overflow-hidden relative border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col justify-between p-2">
                      <div>
                        <p className="text-amber-400 text-[10px] leading-none">★★★★★</p>
                        <p className="text-zinc-200 text-[9px] font-semibold mt-1 leading-tight">&ldquo;Most comfortable shoes I&rsquo;ve ever owned.&rdquo;</p>
                        <p className="text-zinc-500 text-[8px] mt-0.5">Sarah K. — verified buyer</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="w-12 opacity-60">
                          <SneakerSvg shoeColor="#e8ddd0" accentColor="#059669" />
                        </div>
                        <div className="inline-block bg-emerald-600 text-white text-[7px] px-1.5 py-0.5 rounded font-bold">Try risk-free</div>
                      </div>
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center">
                        <Check className="w-2 h-2 text-emerald-400" />
                      </div>
                    </div>

                    {/* V4: Color-split lifestyle — top green / bottom cream, shoe at seam */}
                    <div className="aspect-square rounded-xl overflow-hidden relative border border-zinc-700 flex flex-col">
                      <div className="h-[48%] bg-emerald-700" />
                      <div className="h-[52%] bg-stone-100" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <SneakerSvg shoeColor="white" accentColor="#f59e0b" />
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-zinc-700 text-[9px] font-bold leading-tight">Your next daily wear.</p>
                        <div className="mt-0.5 inline-block bg-emerald-700 text-white text-[7px] px-1.5 py-0.5 rounded font-semibold">Shop Allbirds</div>
                      </div>
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center">
                        <Check className="w-2 h-2 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                  Headlines generated
                </p>
                <div className="space-y-1.5">
                  {[
                    "Built for the run. Worn all day.",
                    "Zero compromise on comfort.",
                    "Your next favourite shoe is here.",
                  ].map((line) => (
                    <p key={line} className="text-[11px] text-zinc-300 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 order-1 lg:order-2">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            AI creative variations
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            One product photo. Twenty on-brand variations in 60 seconds.
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            Drop in a competitor ad you want to respond to. Add your product
            image. Voltic generates multiple scene variations, writes the
            headlines and CTAs in your brand voice, and exports to every Meta
            format.
          </p>
          <ul className="space-y-3">
            {[
              "Background scenes matched to your product category",
              "Headlines and CTAs in your tone via GPT-4o",
              "1:1, 4:5, 9:16, and 16:9 export in one click",
              "Every output quality-checked before delivery",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
          >
            Generate your first variation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Automated Reporting ───────────────────────────────────────────────────────

function ReportingFeature() {
  return (
    <section className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            Automated reporting
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Weekly performance reports that write themselves.
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            Connect your Meta ad account and a Slack channel. Voltic pulls the
            numbers, formats them into a clean summary, and sends it on the
            schedule you set. No spreadsheet. No manual work.
          </p>
          <ul className="space-y-3">
            {[
              "Campaigns ranked by spend and ROAS",
              "Creative fatigue alerts before CPMs start climbing",
              "Competitor activity highlights from the past week",
              "Delivered to any Slack channel on your schedule",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
          >
            Set up your first report
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-emerald-500/4 rounded-3xl blur-2xl pointer-events-none" />
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xl">
            <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2.5 bg-zinc-900/60">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-zinc-300"># performance-reports</span>
            </div>

            <div className="p-5">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                  <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-zinc-100">Voltic</span>
                    <span className="text-[11px] text-zinc-500">Today at 9:00 AM</span>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Weekly Performance Summary
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Week of Jun 9 to Jun 15, 2026
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: "Total Spend", value: "$18.4K" },
                        { label: "Avg. ROAS", value: "3.8x" },
                        { label: "Top CPA", value: "$14.20" },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="bg-zinc-900/70 rounded-lg p-2.5 border border-zinc-700/50"
                        >
                          <p className="text-[10px] text-zinc-500">{label}</p>
                          <p className="text-sm font-bold text-white mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      {[
                        {
                          color: "bg-emerald-500",
                          text: 'Top campaign: "Summer Restock" +22% vs last week',
                        },
                        {
                          color: "bg-amber-500",
                          text: "3 creatives flagged for fatigue. CTR below 0.8%.",
                        },
                        {
                          color: "bg-sky-500",
                          text: "Gymshark launched 8 new ads targeting your category.",
                        },
                      ].map(({ color, text }) => (
                        <div key={text} className="flex items-start gap-2 text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0 mt-0.5`} />
                          <span className="text-zinc-400">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      Icon: Zap,
      title: "Connect your Meta ad account",
      body: "OAuth in under two minutes. Voltic links to your campaigns and the Meta Ads Library immediately.",
    },
    {
      n: "02",
      Icon: Eye,
      title: "Add the brands you want to track",
      body: "Search by brand name or Facebook page. Add up to 100 competitors. Voltic monitors their ads around the clock.",
    },
    {
      n: "03",
      Icon: Bell,
      title: "Generate variations and automate reports",
      body: "Upload a product photo to create ad variations. Pick a Slack channel and a schedule. Everything else runs on its own.",
    },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 space-y-4">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white max-w-2xl leading-tight">
            From setup to your first insight in one afternoon
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {steps.map(({ n, Icon, title, body }) => (
            <div key={n} className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-4xl font-bold text-zinc-800">{n}</span>
              </div>
              <h3 className="text-[1.05rem] font-semibold text-white leading-snug">{title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Simple, usage-based plans
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Every plan includes a 7-day free trial. Add credits when you need more.
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

              <Link
                href="/signup"
                className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
                  plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                Start free trial
              </Link>
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

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section className="py-28 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 space-y-4">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
            Questions
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Everything you want to know
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/40 open:border-zinc-700 open:bg-zinc-900/70"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none">
                <span className="font-medium text-zinc-300 group-open:text-white text-sm">
                  {q}
                </span>
                <span className="text-zinc-500 group-open:text-emerald-400 shrink-0 text-xl leading-none font-light">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:block">&#x2212;</span>
                </span>
              </summary>
              <div className="px-6 pb-5 pt-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60">
                {a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-36 px-6 border-t border-zinc-800/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.07),transparent_65%)] pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-3xl text-center space-y-8">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
          Stop guessing what works on Meta.
          <br />
          <span className="text-emerald-400">Start knowing.</span>
        </h2>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
          Join performance teams that use Voltic to track competitors, ship
          better creatives, and get reporting done automatically.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/25 text-base"
        >
          Start for free
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
          {["No credit card required", "7-day free trial", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm text-zinc-600">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-10 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-zinc-400 text-sm">Voltic</span>
        </Link>
        <p className="text-sm text-zinc-700">2026 Voltic. All rights reserved.</p>
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
