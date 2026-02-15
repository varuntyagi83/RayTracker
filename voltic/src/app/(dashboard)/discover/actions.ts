"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { searchAdsLibrary, getWorkspaceBoards, saveAdToBoard } from "@/lib/data/discover";
import { clearAdsLibraryCache, abortActiveScrape } from "@/lib/meta/ads-library";
import { saveCompetitorScrapeRun } from "@/lib/data/competitors";
import { generateAdInsights } from "@/lib/ai/insights";
import {
  getExistingInsight,
  saveInsight,
  checkAndDeductCredits,
  refundCredits,
  getInsightsByMetaLibraryIds,
  INSIGHT_CREDIT_COST,
} from "@/lib/data/insights";
import { generateAdComparison } from "@/lib/ai/comparison";
import {
  saveComparison,
  getComparison,
  COMPARISON_CREDIT_COST,
} from "@/lib/data/comparisons";
import type {
  DiscoverSearchParams,
  DiscoverAd,
  AdInsightRecord,
  AdComparisonRecord,
} from "@/types/discover";

// ─── Existing Actions ────────────────────────────────────────────────────────

export async function fetchDiscoverAds(params: DiscoverSearchParams) {
  const workspace = await getWorkspace();
  if (!workspace) return { ads: [], totalCount: 0, error: "No workspace" };
  return await searchAdsLibrary(params);
}

export async function fetchBoards() {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" } as const;
  return await getWorkspaceBoards(workspace.id);
}

export async function saveToBoard(input: { boardId: string; ad: DiscoverAd }) {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" } as const;
  return await saveAdToBoard(workspace.id, input.boardId, input.ad);
}

export async function saveDiscoverRunAction(input: {
  brandName: string;
  ads: DiscoverAd[];
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };
  return await saveCompetitorScrapeRun(workspace.id, input.brandName, input.ads);
}

export async function clearDiscoverCache() {
  clearAdsLibraryCache();
  return { success: true };
}

export async function stopScrape() {
  return await abortActiveScrape();
}

// ─── Analyze Ad (AI Insights) ────────────────────────────────────────────────

const analyzeAdSchema = z.object({
  id: z.string().min(1),
  pageName: z.string().min(1),
  headline: z.string(),
  bodyText: z.string(),
  mediaType: z.enum(["image", "video", "carousel"]),
  platforms: z.array(z.string()),
  linkUrl: z.string().nullable(),
  runtimeDays: z.number(),
  isActive: z.boolean(),
});

export async function analyzeAd(
  input: z.input<typeof analyzeAdSchema>
): Promise<{ data?: AdInsightRecord; error?: string }> {
  // 1. Auth check
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  // 2. Validate input
  const parsed = analyzeAdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ad = parsed.data;

  // 3. Check if insight already exists (free — no credit charge)
  const existing = await getExistingInsight(workspace.id, ad.id);
  if (existing) {
    return { data: existing };
  }

  // 4. Check and deduct credits
  const creditResult = await checkAndDeductCredits(workspace.id, INSIGHT_CREDIT_COST, "ad_insight");
  if (!creditResult.success) {
    return { error: creditResult.error ?? "Insufficient credits" };
  }

  // 5. Generate insights via OpenAI
  try {
    const insights = await generateAdInsights({
      brandName: ad.pageName,
      headline: ad.headline,
      bodyText: ad.bodyText,
      format: ad.mediaType,
      platforms: ad.platforms,
      landingPageUrl: ad.linkUrl,
      runtimeDays: ad.runtimeDays,
      isActive: ad.isActive,
    });

    // 6. Save to database
    const saveResult = await saveInsight(
      workspace.id,
      ad.id,
      ad.pageName,
      ad.headline,
      ad.bodyText,
      ad.mediaType,
      insights
    );

    if (!saveResult.success) {
      await refundCredits(workspace.id, INSIGHT_CREDIT_COST);
      return { error: saveResult.error ?? "Failed to save insights" };
    }

    // 7. Return the saved record
    const record = await getExistingInsight(workspace.id, ad.id);
    return { data: record ?? undefined };
  } catch (err) {
    // Refund credits on failure
    await refundCredits(workspace.id, INSIGHT_CREDIT_COST);
    console.error("[analyzeAd] OpenAI error:", err);
    return { error: "Failed to generate insights. Credits have been refunded." };
  }
}

// ─── Fetch Existing Insights (batch) ─────────────────────────────────────────

export async function fetchExistingInsights(
  metaLibraryIds: string[]
): Promise<{ data?: Record<string, AdInsightRecord>; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const result = await getInsightsByMetaLibraryIds(workspace.id, metaLibraryIds);
  return { data: result };
}

// ─── Compare Ads (Cross-Brand) ──────────────────────────────────────────────

const compareAdsSchema = z.object({
  ads: z
    .array(
      z.object({
        id: z.string().min(1),
        pageName: z.string().min(1),
        headline: z.string(),
        bodyText: z.string(),
        mediaType: z.enum(["image", "video", "carousel"]),
        platforms: z.array(z.string()),
        linkUrl: z.string().nullable(),
        runtimeDays: z.number(),
        isActive: z.boolean(),
        mediaThumbnailUrl: z.string().nullable(),
      })
    )
    .min(2)
    .max(4),
});

export async function compareAds(
  input: z.input<typeof compareAdsSchema>
): Promise<{ data?: AdComparisonRecord; error?: string }> {
  // 1. Auth check
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  // 2. Validate input
  const parsed = compareAdsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { ads } = parsed.data;

  // 3. Check and deduct credits
  const creditResult = await checkAndDeductCredits(
    workspace.id,
    COMPARISON_CREDIT_COST,
    "comparison"
  );
  if (!creditResult.success) {
    return { error: creditResult.error ?? "Insufficient credits" };
  }

  // 4. Generate comparison via OpenAI
  try {
    const result = await generateAdComparison(ads);

    // 5. Save to database
    const adIds = ads.map((a) => a.id);
    const brandNames = ads.map((a) => a.pageName);
    const saveResult = await saveComparison(
      workspace.id,
      adIds,
      brandNames,
      result
    );

    if (!saveResult.success) {
      await refundCredits(workspace.id, COMPARISON_CREDIT_COST);
      return { error: saveResult.error ?? "Failed to save comparison" };
    }

    // 6. Return the saved record
    const record = await getComparison(workspace.id, saveResult.id!);
    return { data: record ?? undefined };
  } catch (err) {
    // Refund credits on failure
    await refundCredits(workspace.id, COMPARISON_CREDIT_COST);
    console.error("[compareAds] OpenAI error:", err);
    return {
      error: "Failed to generate comparison. Credits have been refunded.",
    };
  }
}
