"use server";

import { getWorkspace } from "@/lib/supabase/queries";
import {
  getCampaignList,
  getCampaignDetail,
  getCampaignCreatives,
  getCampaignComparison,
  getCampaignFilterOptions,
} from "@/lib/data/campaign-analysis";
import type { DateRange } from "@/types/campaign-analysis";

// ─── Fetch Campaign List ────────────────────────────────────────────────────

export async function fetchCampaignList(input: {
  dateRange: DateRange;
  search?: string;
  statusFilter?: string;
  objectiveFilter?: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
}) {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  return await getCampaignList({
    workspaceId: workspace.id,
    ...input,
  });
}

// ─── Fetch Campaign Detail ──────────────────────────────────────────────────

export async function fetchCampaignDetail(input: {
  campaignId: string;
  dateRange: DateRange;
}) {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  const detail = await getCampaignDetail(input.campaignId, workspace.id, input.dateRange);
  if (!detail) return { error: "Campaign not found" } as const;
  return detail;
}

// ─── Fetch Campaign Creatives ───────────────────────────────────────────────

export async function fetchCampaignCreatives(input: {
  campaignId: string;
  dateRange: DateRange;
}) {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  return await getCampaignCreatives(input.campaignId, workspace.id, input.dateRange);
}

// ─── Fetch Comparison Data ──────────────────────────────────────────────────

export async function fetchCampaignComparison(input: {
  campaignIds: string[];
  dateRange: DateRange;
}) {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  return await getCampaignComparison(input.campaignIds, workspace.id, input.dateRange);
}

// ─── Fetch Filter Options ───────────────────────────────────────────────────

export async function fetchFilterOptions() {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  return await getCampaignFilterOptions(workspace.id);
}
