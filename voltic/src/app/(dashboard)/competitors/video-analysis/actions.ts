"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { getUser } from "@/lib/supabase/queries";
import { analyzeVideoAd } from "@/lib/ai/video-analysis";
import { generateHooksMatrix } from "@/lib/ai/hooks-generator";
import {
  createVideoAnalysis,
  updateVideoAnalysis,
  getVideoAnalysesByBrand,
  getDownloadedVideosByBrand,
  getVideoBrands,
  createHooksMatrixRun,
  getHooksMatrixRuns,
} from "@/lib/data/video-analysis";
import { checkAndDeductCredits } from "@/lib/data/insights";
import { trackServer } from "@/lib/analytics/posthog-server";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis";
import type { HooksMatrixResult, HookStrategy } from "@/lib/ai/hooks-generator";
import type { VideoAnalysisRecord, HooksMatrixRecord, DownloadedVideoRecord } from "@/lib/data/video-analysis";

// Credit costs
const CREDITS: Record<string, Record<string, number>> = {
  gemini: { quick: 2, detailed: 5 },
  gpt4o: { quick: 5, detailed: 10 },
};
const HOOKS_MATRIX_CREDITS = 10;

// ─── Fetch Brands with Videos ────────────────────────────────────────────────

export async function getVideoBrandsAction(): Promise<{
  data?: string[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  const brands = await getVideoBrands(workspace.id);
  return { data: brands };
}

// ─── Fetch Downloaded Videos for a Brand ────────────────────────────────────

export async function getDownloadedVideosAction(brandName?: string): Promise<{
  data?: DownloadedVideoRecord[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  const videos = await getDownloadedVideosByBrand(workspace.id, brandName);
  return { data: videos };
}

// ─── Fetch Past Analyses ─────────────────────────────────────────────────────

export async function getVideoAnalysesAction(brandName: string): Promise<{
  data?: VideoAnalysisRecord[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  const analyses = await getVideoAnalysesByBrand(workspace.id, brandName);
  return { data: analyses };
}

// ─── Analyze Single Video ────────────────────────────────────────────────────

const analyzeVideoSchema = z.object({
  videoUrl: z.string().url().max(2048),
  brandName: z.string().min(1).max(100),
  downloadedMediaId: z.string().uuid().optional(),
  provider: z.enum(["gemini", "gpt4o"]).default("gemini"),
  depth: z.enum(["quick", "detailed"]).default("quick"),
});

export async function analyzeVideoAction(
  input: z.input<typeof analyzeVideoSchema>
): Promise<{ data?: VideoAnalysisRecord; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = analyzeVideoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { videoUrl, brandName, downloadedMediaId, provider, depth } = parsed.data;
  const creditsNeeded = CREDITS[provider]?.[depth] ?? 2;

  const creditResult = await checkAndDeductCredits(workspace.id, creditsNeeded);
  if (!creditResult.success) return { error: creditResult.error ?? "Insufficient credits" };

  const record = await createVideoAnalysis(workspace.id, {
    downloadedMediaId,
    brandName,
    videoUrl,
    provider,
    analysisDepth: depth,
  });

  trackServer("video_analysis_started", user.id, {
    workspace_id: workspace.id,
    brand: brandName,
    provider,
    depth,
    video_count: 1,
  });

  const start = Date.now();

  try {
    const result = await analyzeVideoAd({ videoUrl, brandName, provider, depth });

    await updateVideoAnalysis(record.id, workspace.id, {
      result,
      status: "completed",
      creditsUsed: creditsNeeded,
      durationMs: Date.now() - start,
    });

    trackServer("video_analysis_completed", user.id, {
      workspace_id: workspace.id,
      brand: brandName,
      provider,
      videos_analyzed: 1,
      total_duration_ms: Date.now() - start,
      credits_used: creditsNeeded,
    });

    return {
      data: {
        ...record,
        hook: result.hook,
        narrative: result.narrative,
        cta: result.cta,
        brand_elements: result.brand_elements,
        text_overlays: result.text_overlays,
        competitive_insight: result.competitive_insight,
        credits_used: creditsNeeded,
        processing_status: "completed",
        duration_ms: Date.now() - start,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Analysis failed";

    // Refund credits on failure
    await updateVideoAnalysis(record.id, workspace.id, {
      status: "failed",
      errorMessage,
      durationMs: Date.now() - start,
    });

    trackServer("video_analysis_failed", user.id, {
      workspace_id: workspace.id,
      brand: brandName,
      video_id: record.id,
      error: errorMessage,
    });

    return { error: errorMessage };
  }
}

// ─── Generate Hooks Matrix ────────────────────────────────────────────────────

const generateHooksSchema = z.object({
  competitorBrands: z.array(z.string()).min(1).max(10),
  yourBrand: z.object({
    name: z.string().min(1).max(100),
    product_description: z.string().min(1).max(2000),
    target_audience: z.string().max(500).optional(),
  }),
  hookCount: z.number().min(5).max(100).default(45),
  strategies: z
    .array(
      z.enum([
        "curiosity",
        "pain_point",
        "social_proof",
        "urgency",
        "contrarian",
        "authority",
        "storytelling",
        "statistic",
      ])
    )
    .min(1)
    .default([
      "curiosity",
      "pain_point",
      "social_proof",
      "urgency",
      "contrarian",
      "authority",
      "storytelling",
      "statistic",
    ]),
  brandGuidelinesId: z.string().uuid().optional(),
});

export async function generateHooksMatrixAction(
  input: z.input<typeof generateHooksSchema>
): Promise<{ data?: HooksMatrixRecord; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = generateHooksSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { competitorBrands, yourBrand, hookCount, strategies, brandGuidelinesId } = parsed.data;

  // Fetch completed analyses for each brand
  const competitorAnalyses = await Promise.all(
    competitorBrands.map(async (brand) => {
      const analyses = await getVideoAnalysesByBrand(workspace.id, brand);
      return {
        brand,
        videos: analyses
          .filter((a) => a.hook && a.narrative && a.cta)
          .map((a) => ({
            hook: a.hook!,
            narrative: a.narrative!,
            cta: a.cta!,
            brand_elements: a.brand_elements!,
            text_overlays: a.text_overlays ?? [],
            competitive_insight: a.competitive_insight ?? "",
          })),
      };
    })
  );

  const totalVideos = competitorAnalyses.reduce((sum, b) => sum + b.videos.length, 0);
  if (totalVideos === 0) {
    return { error: "No completed video analyses found. Analyze competitor videos first." };
  }

  const creditResult = await checkAndDeductCredits(workspace.id, HOOKS_MATRIX_CREDITS);
  if (!creditResult.success) return { error: creditResult.error ?? "Insufficient credits" };

  try {
    const result = await generateHooksMatrix({
      competitorAnalyses: competitorAnalyses as Parameters<typeof generateHooksMatrix>[0]["competitorAnalyses"],
      yourBrand,
      hookCount,
      strategies: strategies as HookStrategy[],
    });

    const analysisIds = competitorAnalyses.flatMap((b) => b.videos.map(() => ""));

    const run = await createHooksMatrixRun(workspace.id, {
      competitorBrands,
      videoAnalysisIds: analysisIds,
      yourBrandName: yourBrand.name,
      brandGuidelinesId,
      hookCount,
      strategies,
      result,
      creditsUsed: HOOKS_MATRIX_CREDITS,
    });

    trackServer("hooks_matrix_generated", user.id, {
      workspace_id: workspace.id,
      competitor_count: competitorBrands.length,
      videos_analyzed: totalVideos,
      hooks_generated: result.hooks.length,
      credits_used: HOOKS_MATRIX_CREDITS,
    });

    return { data: run };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Generation failed";
    return { error: errorMessage };
  }
}

// ─── Get Past Hooks Matrix Runs ───────────────────────────────────────────────

export async function getHooksMatrixRunsAction(): Promise<{
  data?: HooksMatrixRecord[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  const runs = await getHooksMatrixRuns(workspace.id);
  return { data: runs };
}
