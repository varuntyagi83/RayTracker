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
      <DashboardTracker adAccountCount={kpis.adAccountCount} />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Workspace Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last synced ({workspace.timezone}): {lastSynced}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Overall metrics for {kpis.adAccountCount} Meta ad account
          {kpis.adAccountCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          type="revenue"
          today={kpis.today.revenue}
          yesterday={kpis.yesterday.revenue}
          last7Days={kpis.last7Days.revenue}
          currency={workspace.currency}
        />
        <KPICard
          type="spend"
          today={kpis.today.spend}
          yesterday={kpis.yesterday.spend}
          last7Days={kpis.last7Days.spend}
          currency={workspace.currency}
        />
        <KPICard
          type="profit"
          today={kpis.today.profit}
          yesterday={kpis.yesterday.profit}
          last7Days={kpis.last7Days.profit}
          currency={workspace.currency}
          marginPercent={marginPercent}
        />
      </div>

      {/* Top Performing Assets */}
      <TopAssets
        creatives={creatives}
        headlines={headlines}
        copy={copy}
        landingPages={landingPages}
        currency={workspace.currency}
      />
    </div>
  );
}
