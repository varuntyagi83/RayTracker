import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/supabase/queries";
import { getAutomations } from "@/lib/data/automations";
import { AutomationsListClient } from "./components/automations-list-client";
import type { Automation } from "@/types/automation";

export default async function AutomationsPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/signup");

  const rawAutomations = await getAutomations(workspace.id);

  // Demo fallback: show placeholder automations when none exist yet
  const automations = rawAutomations.length > 0 ? rawAutomations : [
    {
      id: "demo-1",
      workspace_id: workspace.id,
      name: "Daily Performance Digest",
      description: "Sends a daily summary of top campaigns by ROAS to #performance-team",
      type: "performance" as const,
      status: "active" as const,
      config: { aggregation: "campaigns", metrics: ["spend", "roas", "revenue"], timePeriods: ["yesterday"], sortBy: { metric: "roas", direction: "desc", period: "yesterday" }, classification: { enabled: true, criticalThreshold: 0.8, topThreshold: 2.0 }, filters: { entity: [], metric: [] } },
      schedule: { frequency: "daily" as const, time: "08:00", timezone: workspace.timezone, days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as Automation["schedule"]["days"] },
      delivery: { platform: "slack" as const, slackChannelName: "#performance-team" },
      classification: { enabled: true },
      last_run_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: "demo-2",
      workspace_id: workspace.id,
      name: "Nike Competitor Tracker",
      description: "Monitors Nike's top ads from Meta Ads Library weekly",
      type: "competitor" as const,
      status: "active" as const,
      config: { brandName: "Nike", adsLibraryUrl: "https://www.facebook.com/ads/library/?advertiser_id=nike", scrapeSettings: { topN: 10, impressionPeriod: "last_30d", startedWithin: "last_30d" } },
      schedule: { frequency: "weekly" as const, time: "09:00", timezone: workspace.timezone, days: ["monday"] as Automation["schedule"]["days"] },
      delivery: { platform: "slack" as const, slackChannelName: "#competitor-intel" },
      classification: null,
      last_run_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    {
      id: "demo-3",
      workspace_id: workspace.id,
      name: "Comment Digest — HK Main Page",
      description: "Hourly digest of new comments on ads from the HK Main Account page",
      type: "comments" as const,
      status: "paused" as const,
      config: { pages: [{ id: "p1", pageId: "123456789", pageName: "HK Main Account", hasInstagram: true, instagramHandle: "hkmainaccount" }], postFilters: { postType: "ad", postAge: "last_24h" }, frequency: "3h" },
      schedule: { frequency: "daily" as const, time: "00:00", timezone: workspace.timezone, days: [] },
      delivery: { platform: "slack" as const, slackChannelName: "#comments-hk" },
      classification: null,
      last_run_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule performance reports, competitor monitoring, and comment
          digests.
        </p>
      </div>
      <AutomationsListClient automations={automations} />
    </div>
  );
}
