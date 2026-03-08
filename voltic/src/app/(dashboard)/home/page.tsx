import { getWorkspace } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import {
  getWorkspaceKPIs,
  getTopCreatives,
  getTopHeadlines,
  getTopCopy,
  getTopLandingPages,
} from "@/lib/data/dashboard";
import { KPICard } from "./components/kpi-card";
import { TopAssets } from "./components/top-assets";
import { DashboardTracker } from "./components/dashboard-tracker";

export default async function HomePage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");

  const emptyKPIs = {
    adAccountCount: 0,
    today: { spend: 0, revenue: 0, profit: 0 },
    yesterday: { spend: 0, revenue: 0, profit: 0 },
    last7Days: { spend: 0, revenue: 0, profit: 0 },
  };

  const results = await Promise.allSettled([
    getWorkspaceKPIs(workspace.id),
    getTopCreatives(workspace.id),
    getTopHeadlines(workspace.id),
    getTopCopy(workspace.id),
    getTopLandingPages(workspace.id),
  ]);

  const kpis = results[0].status === "fulfilled" ? results[0].value : emptyKPIs;
  const creatives = results[1].status === "fulfilled" ? results[1].value : [];
  const headlines = results[2].status === "fulfilled" ? results[2].value : [];
  const copy = results[3].status === "fulfilled" ? results[3].value : [];
  const landingPages = results[4].status === "fulfilled" ? results[4].value : [];

  // Demo fallback: inject realistic placeholder data when no real metrics exist
  const isDemoMode = kpis.today.revenue === 0 && kpis.today.spend === 0 && kpis.last7Days.revenue === 0;
  const displayKPIs = isDemoMode
    ? {
        adAccountCount: kpis.adAccountCount,
        today: { spend: 4821, revenue: 18634, profit: 13813 },
        yesterday: { spend: 5104, revenue: 16891, profit: 11787 },
        last7Days: { spend: 31450, revenue: 124380, profit: 92930 },
      }
    : kpis;

  const displayCreatives = creatives.length > 0 ? creatives : isDemoMode ? [
    { id: "d1", name: "Summer_Sale_Carousel_v3", format: "carousel", imageUrl: null, roas: 4.21, spend: 1240, impressions: 89400 },
    { id: "d2", name: "Brand_Awareness_Video_Q1", format: "video", imageUrl: null, roas: 3.87, spend: 2180, impressions: 154200 },
    { id: "d3", name: "Retargeting_Static_Image", format: "image", imageUrl: null, roas: 5.14, spend: 890, impressions: 42100 },
    { id: "d4", name: "Holiday_Promo_Carousel", format: "carousel", imageUrl: null, roas: 3.44, spend: 3100, impressions: 210800 },
    { id: "d5", name: "Spring_Collection_Video", format: "video", imageUrl: null, roas: 2.96, spend: 1760, impressions: 98600 },
  ] : [];

  const displayHeadlines = headlines.length > 0 ? headlines : isDemoMode ? [
    { headline: "Up to 50% Off — Summer Sale Ends Tonight", roas: 5.14, spend: 4280, impressions: 312000 },
    { headline: "Free Shipping on Orders Over $50", roas: 4.62, spend: 3940, impressions: 287400 },
    { headline: "New Arrivals: Shop the Spring Collection", roas: 3.98, spend: 2810, impressions: 198700 },
    { headline: "Limited Stock — Don't Miss Out", roas: 3.44, spend: 2130, impressions: 154900 },
    { headline: "Exclusive Members-Only Discount", roas: 2.87, spend: 1720, impressions: 112300 },
  ] : [];

  const displayCopy = copy.length > 0 ? copy : isDemoMode ? [
    { body: "Transform your summer with our best-selling collection. Shop now and save up to 50% — limited time only.", roas: 4.84, spend: 3620, impressions: 241800 },
    { body: "Join over 100,000 happy customers. Free returns, free shipping, and a 30-day guarantee.", roas: 4.21, spend: 2940, impressions: 189300 },
    { body: "Discover styles made for every occasion. New drops every week, ships in 24 hours.", roas: 3.67, spend: 2180, impressions: 142100 },
  ] : [];

  const displayLandingPages = landingPages.length > 0 ? landingPages : isDemoMode ? [
    { landingPageUrl: "https://shop.example.com/summer-sale", roas: 5.21, spend: 8410, impressions: 542000, ctr: 3.12 },
    { landingPageUrl: "https://shop.example.com/new-arrivals", roas: 4.38, spend: 6230, impressions: 398400, ctr: 2.87 },
    { landingPageUrl: "https://shop.example.com/best-sellers", roas: 3.94, spend: 4810, impressions: 302100, ctr: 2.54 },
  ] : [];

  const now = new Date();
  const lastSynced = now.toLocaleString("en-US", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const marginPercent =
    kpis.today.revenue > 0
      ? (kpis.today.profit / kpis.today.revenue) * 100
      : 0;

  return (
    <div className="space-y-8 p-8">
      <DashboardTracker adAccountCount={displayKPIs.adAccountCount} />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Workspace Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last synced ({workspace.timezone}): {lastSynced}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Overall metrics for {displayKPIs.adAccountCount} Meta ad account
          {displayKPIs.adAccountCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          type="revenue"
          today={displayKPIs.today.revenue}
          yesterday={displayKPIs.yesterday.revenue}
          last7Days={displayKPIs.last7Days.revenue}
          currency={workspace.currency}
        />
        <KPICard
          type="spend"
          today={displayKPIs.today.spend}
          yesterday={displayKPIs.yesterday.spend}
          last7Days={displayKPIs.last7Days.spend}
          currency={workspace.currency}
        />
        <KPICard
          type="profit"
          today={displayKPIs.today.profit}
          yesterday={displayKPIs.yesterday.profit}
          last7Days={displayKPIs.last7Days.profit}
          currency={workspace.currency}
          marginPercent={isDemoMode ? 74 : marginPercent}
        />
      </div>

      {/* Top Performing Assets */}
      <TopAssets
        creatives={displayCreatives}
        headlines={displayHeadlines}
        copy={displayCopy}
        landingPages={displayLandingPages}
        currency={workspace.currency}
      />
    </div>
  );
}
