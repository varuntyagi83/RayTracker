"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  listCompetitorBrands,
  deleteCompetitorBrands,
  getCompetitorAdsForBrands,
  saveCompetitorReport,
  listCompetitorReports,
  deleteCompetitorReport,
} from "@/lib/data/competitors";
import { generateCompetitorReport } from "@/lib/ai/competitor-report";
import { checkAndDeductCredits, refundCredits } from "@/lib/data/insights";
import type { CompetitorBrand, CompetitorReport } from "@/types/competitors";

// Credit cost: 3 base + 2 per ad analyzed
const REPORT_BASE_COST = 3;
const REPORT_PER_AD_COST = 2;

// ─── List Brands ──────────────────────────────────────────────────────────

export async function fetchCompetitorBrandsAction(): Promise<{
  data?: CompetitorBrand[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const brands = await listCompetitorBrands(workspace.id);
  return { data: brands };
}

// ─── Delete Brands ────────────────────────────────────────────────────────

const deleteBrandsSchema = z.object({
  brandIds: z.array(z.string().uuid()).min(1),
});

export async function deleteCompetitorBrandsAction(
  input: z.input<typeof deleteBrandsSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteBrandsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  return await deleteCompetitorBrands(workspace.id, parsed.data.brandIds);
}

// ─── Generate Report ──────────────────────────────────────────────────────

const generateReportSchema = z.object({
  brandIds: z.array(z.string().uuid()).min(1),
});

export async function generateCompetitorReportAction(
  input: z.input<typeof generateReportSchema>
): Promise<{ data?: CompetitorReport; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = generateReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { brandIds } = parsed.data;

  // 1. Fetch all ads for selected brands
  const ads = await getCompetitorAdsForBrands(workspace.id, brandIds);
  if (ads.length === 0) {
    return { error: "No ads found for the selected competitors." };
  }

  // 2. Get brand names for the title
  const brands = await listCompetitorBrands(workspace.id);
  const selectedBrands = brands.filter((b) => brandIds.includes(b.id));
  const brandNames = selectedBrands.map((b) => b.name);

  // 3. Calculate credit cost
  const creditCost = REPORT_BASE_COST + REPORT_PER_AD_COST * ads.length;

  // 4. Check and deduct credits
  const creditResult = await checkAndDeductCredits(workspace.id, creditCost);
  if (!creditResult.success) {
    return { error: creditResult.error ?? "Insufficient credits" };
  }

  // 5. Generate report via OpenAI
  try {
    const result = await generateCompetitorReport(ads, brandNames);

    // 6. Build title
    const title =
      brandNames.length <= 3
        ? `${brandNames.join(" vs ")} Report`
        : `${brandNames.length} Competitors Report`;

    // 7. Save report
    const saveResult = await saveCompetitorReport(workspace.id, {
      title,
      competitorBrandIds: brandIds,
      competitorBrandNames: brandNames,
      adCount: ads.length,
      perAdAnalyses: result.perAdAnalyses,
      crossBrandSummary: result.crossBrandSummary,
      model: "gpt-4o",
      creditsUsed: creditCost,
    });

    if (!saveResult.success || !saveResult.id) {
      await refundCredits(workspace.id, creditCost);
      return { error: saveResult.error ?? "Failed to save report" };
    }

    // 8. Return the full report
    const report: CompetitorReport = {
      id: saveResult.id,
      workspaceId: workspace.id,
      title,
      competitorBrandIds: brandIds,
      competitorBrandNames: brandNames,
      adCount: ads.length,
      perAdAnalyses: result.perAdAnalyses,
      crossBrandSummary: result.crossBrandSummary,
      model: "gpt-4o",
      creditsUsed: creditCost,
      createdAt: new Date().toISOString(),
    };

    return { data: report };
  } catch (err) {
    await refundCredits(workspace.id, creditCost);
    console.error("[generateCompetitorReportAction] error:", err);
    return { error: "Report generation failed. Credits have been refunded." };
  }
}

// ─── List Reports ─────────────────────────────────────────────────────────

export async function fetchCompetitorReportsAction(): Promise<{
  data?: CompetitorReport[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const reports = await listCompetitorReports(workspace.id);
  return { data: reports };
}

// ─── Delete Report ────────────────────────────────────────────────────────

export async function deleteCompetitorReportAction(input: {
  reportId: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await deleteCompetitorReport(workspace.id, input.reportId);
}
