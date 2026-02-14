"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  getBoards,
  getBoardWithAds,
  getBoardThumbnails,
  createBoard,
  updateBoard,
  deleteBoard,
  removeAdFromBoard,
} from "@/lib/data/boards";
import {
  getVariationsForAd,
  createVariation,
  completeVariation,
  failVariation,
  deleteVariation,
} from "@/lib/data/variations";
import { getBrandGuidelines } from "@/lib/data/brand-guidelines";
import { getAsset } from "@/lib/data/assets";
import { checkAndDeductCredits, refundCredits } from "@/lib/data/insights";
import { generateVariationText, generateVariationImage } from "@/lib/ai/variations";
import { enhanceCreativeText } from "@/lib/ai/creative-enhance";
import { VARIATION_CREDIT_COST, CREATIVE_ENHANCE_CREDIT_COST } from "@/types/variations";
import type { Board, BoardWithAds, SavedAd } from "@/types/boards";
import type { Variation } from "@/types/variations";

// ─── Fetch All Boards ───────────────────────────────────────────────────────

export async function fetchBoards(): Promise<{
  data?: { boards: Board[]; thumbnails: Record<string, string[]> };
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const boards = await getBoards(workspace.id);
  const thumbnails = await getBoardThumbnails(
    workspace.id,
    boards.map((b) => b.id)
  );

  return { data: { boards, thumbnails } };
}

// ─── Fetch Single Board ─────────────────────────────────────────────────────

const fetchBoardSchema = z.object({
  boardId: z.string().uuid(),
});

export async function fetchBoard(
  input: z.input<typeof fetchBoardSchema>
): Promise<{ data?: BoardWithAds; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = fetchBoardSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const board = await getBoardWithAds(workspace.id, parsed.data.boardId);
  if (!board) return { error: "Board not found" };

  return { data: board };
}

// ─── Create Board ───────────────────────────────────────────────────────────

const createBoardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export async function createBoardAction(
  input: z.input<typeof createBoardSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = createBoardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await createBoard(workspace.id, parsed.data.name, parsed.data.description);
}

// ─── Update Board ───────────────────────────────────────────────────────────

const updateBoardSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export async function updateBoardAction(
  input: z.input<typeof updateBoardSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = updateBoardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await updateBoard(
    workspace.id,
    parsed.data.boardId,
    parsed.data.name,
    parsed.data.description
  );
}

// ─── Delete Board ───────────────────────────────────────────────────────────

const deleteBoardSchema = z.object({
  boardId: z.string().uuid(),
});

export async function deleteBoardAction(
  input: z.input<typeof deleteBoardSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteBoardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteBoard(workspace.id, parsed.data.boardId);
}

// ─── Remove Ad from Board ───────────────────────────────────────────────────

const removeAdSchema = z.object({
  adId: z.string().uuid(),
});

export async function removeAdAction(
  input: z.input<typeof removeAdSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = removeAdSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await removeAdFromBoard(workspace.id, parsed.data.adId);
}

// ─── Fetch Variations for a Saved Ad ─────────────────────────────────────────

const fetchVariationsSchema = z.object({
  savedAdId: z.string().uuid(),
});

export async function fetchVariationsAction(
  input: z.input<typeof fetchVariationsSchema>
): Promise<{ data?: Variation[]; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = fetchVariationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const variations = await getVariationsForAd(workspace.id, parsed.data.savedAdId);
  return { data: variations };
}

// ─── Generate Variations ─────────────────────────────────────────────────────

const generateVariationsSchema = z.object({
  savedAdId: z.string().uuid(),
  assetId: z.string().uuid(),
  strategies: z.array(z.enum([
    "hero_product", "curiosity", "pain_point",
    "proof_point", "image_only", "text_only",
  ])).min(1).max(6),
});

export async function generateVariationsAction(
  input: z.input<typeof generateVariationsSchema>
): Promise<{
  results: Array<{ strategy: string; success: boolean; variationId?: string; error?: string }>;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { results: [], error: "No workspace" };

  const parsed = generateVariationsSchema.safeParse(input);
  if (!parsed.success)
    return { results: [], error: parsed.error.issues[0].message };

  const { savedAdId, assetId, strategies } = parsed.data;
  const totalCost = VARIATION_CREDIT_COST * strategies.length;

  // Check credits
  const creditCheck = await checkAndDeductCredits(workspace.id, totalCost);
  if (!creditCheck.success) {
    return { results: [], error: creditCheck.error };
  }

  // Fetch saved ad from board
  const board = await getBoardWithAds(workspace.id, savedAdId);
  // The savedAdId might be in any board — find the ad
  let savedAd: SavedAd | undefined;

  // We need to find the saved ad directly
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data: adRow } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("id", savedAdId)
    .single();

  if (!adRow) {
    await refundCredits(workspace.id, totalCost);
    return { results: [], error: "Saved ad not found" };
  }

  savedAd = {
    id: adRow.id,
    boardId: adRow.board_id,
    source: adRow.source,
    metaLibraryId: adRow.meta_library_id,
    brandName: adRow.brand_name,
    headline: adRow.headline,
    body: adRow.body,
    format: adRow.format,
    imageUrl: adRow.image_url,
    videoUrl: adRow.video_url,
    landingPageUrl: adRow.landing_page_url,
    platforms: adRow.platforms,
    startDate: adRow.start_date,
    runtimeDays: adRow.runtime_days,
    createdAt: adRow.created_at,
  };

  // Fetch asset
  const asset = await getAsset(workspace.id, assetId);
  if (!asset) {
    await refundCredits(workspace.id, totalCost);
    return { results: [], error: "Asset not found" };
  }

  // Fetch brand guidelines
  const brandGuidelines = await getBrandGuidelines(workspace.id);

  // Generate variations sequentially
  const results: Array<{ strategy: string; success: boolean; variationId?: string; error?: string }> = [];

  for (const strategy of strategies) {
    // Create pending variation record
    const variationResult = await createVariation(
      workspace.id,
      savedAdId,
      assetId,
      strategy,
      VARIATION_CREDIT_COST
    );

    if (!variationResult.success || !variationResult.id) {
      await refundCredits(workspace.id, VARIATION_CREDIT_COST);
      results.push({ strategy, success: false, error: variationResult.error });
      continue;
    }

    const variationId = variationResult.id;

    try {
      // Generate text
      const textResult = await generateVariationText(
        savedAd,
        asset,
        strategy,
        brandGuidelines
      );

      // Generate image (unless text_only)
      let imageUrl: string | null = null;
      if (strategy !== "text_only") {
        const dalleUrl = await generateVariationImage(
          savedAd,
          asset,
          strategy,
          brandGuidelines
        );
        imageUrl = dalleUrl;
      }

      // Complete variation
      await completeVariation(variationId, {
        generatedHeadline: textResult.headline,
        generatedBody: textResult.body,
        generatedImageUrl: imageUrl ?? undefined,
      });

      results.push({ strategy, success: true, variationId });
    } catch (err) {
      await failVariation(variationId);
      await refundCredits(workspace.id, VARIATION_CREDIT_COST);
      results.push({
        strategy,
        success: false,
        error: err instanceof Error ? err.message : "Generation failed",
      });
    }
  }

  return { results };
}

// ─── Delete Variation ────────────────────────────────────────────────────────

const deleteVariationSchema = z.object({
  variationId: z.string().uuid(),
});

export async function deleteVariationAction(
  input: z.input<typeof deleteVariationSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteVariationSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteVariation(workspace.id, parsed.data.variationId);
}

// ─── Enhance Creatives (AI Creative Builder) ────────────────────────────────

const enhanceCreativesSchema = z.object({
  combinations: z.array(z.object({
    headline: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
  })).min(1).max(20),
});

export async function enhanceCreativesAction(
  input: z.input<typeof enhanceCreativesSchema>
): Promise<{
  results?: Array<{ headline: string; body: string }>;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = enhanceCreativesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { combinations } = parsed.data;
  const totalCost = CREATIVE_ENHANCE_CREDIT_COST * combinations.length;

  // Check credits
  const creditCheck = await checkAndDeductCredits(workspace.id, totalCost);
  if (!creditCheck.success) return { error: creditCheck.error };

  // Fetch brand guidelines
  const brandGuidelines = await getBrandGuidelines(workspace.id);

  try {
    const results: Array<{ headline: string; body: string }> = [];

    for (const combo of combinations) {
      const enhanced = await enhanceCreativeText(
        combo.headline,
        combo.body,
        brandGuidelines
      );
      results.push(enhanced);
    }

    return { results };
  } catch (err) {
    await refundCredits(workspace.id, totalCost);
    return { error: err instanceof Error ? err.message : "Enhancement failed" };
  }
}
