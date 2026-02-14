"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  getCampaignList,
  getCampaignDetail,
  getCampaignCreatives,
  getCampaignComparison,
  getCampaignFilterOptions,
} from "@/lib/data/campaign-analysis";
import type { DateRange } from "@/types/campaign-analysis";

const dateRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const campaignListSchema = z.object({
  dateRange: dateRangeSchema,
  search: z.string().max(200).optional(),
  statusFilter: z.string().max(50).optional(),
  objectiveFilter: z.string().max(50).optional(),
  sortKey: z.string().min(1),
  sortDirection: z.enum(["asc", "desc"]),
});

// ─── Fetch Campaign List ────────────────────────────────────────────────────

export async function fetchCampaignList(input: {
  dateRange: DateRange;
  search?: string;
  statusFilter?: string;
  objectiveFilter?: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
}) {
  const parsed = campaignListSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" } as const;

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;

  return await getCampaignList({
    workspaceId: workspace.id,
    ...parsed.data,
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
