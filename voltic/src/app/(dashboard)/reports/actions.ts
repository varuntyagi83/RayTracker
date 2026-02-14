"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import type { ReportParams, DateRange, ReportSort, ReportResult } from "@/types/reports";
import {
  getTopAdsReport,
  getTopCampaignsReport,
  getTopCreativesReport,
  getTopLandingPagesReport,
  getTopHeadlinesReport,
  getTopCopyReport,
} from "@/lib/data/reports";

const fetchReportSchema = z.object({
  dateRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
  }),
  sort: z.object({
    key: z.string().min(1),
    direction: z.enum(["asc", "desc"]),
  }),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
});

interface FetchReportInput {
  dateRange: DateRange;
  sort: ReportSort;
  page: number;
  pageSize: number;
}

async function buildParams(input: FetchReportInput): Promise<ReportParams | null> {
  const parsed = fetchReportSchema.safeParse(input);
  if (!parsed.success) return null;

  const workspace = await getWorkspace();
  if (!workspace) return null;
  return {
    workspaceId: workspace.id,
    dateRange: parsed.data.dateRange,
    sort: parsed.data.sort,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  };
}

export async function fetchTopAdsReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopAdsReport(params);
}

export async function fetchTopCampaignsReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopCampaignsReport(params);
}

export async function fetchTopCreativesReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopCreativesReport(params);
}

export async function fetchTopLandingPagesReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopLandingPagesReport(params);
}

export async function fetchTopHeadlinesReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopHeadlinesReport(params);
}

export async function fetchTopCopyReport(input: FetchReportInput) {
  const params = await buildParams(input);
  if (!params) return { error: "No workspace" } as const;
  return await getTopCopyReport(params);
}
