"use server";

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

interface FetchReportInput {
  dateRange: DateRange;
  sort: ReportSort;
  page: number;
  pageSize: number;
}

async function buildParams(input: FetchReportInput): Promise<ReportParams | null> {
  const workspace = await getWorkspace();
  if (!workspace) return null;
  return {
    workspaceId: workspace.id,
    dateRange: input.dateRange,
    sort: input.sort,
    page: input.page,
    pageSize: input.pageSize,
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
