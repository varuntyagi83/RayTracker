"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { getBoards, getBoardWithAds } from "@/lib/data/boards";
import { getAllVariations, deleteVariation } from "@/lib/data/variations";
import { getAssets } from "@/lib/data/assets";
import type { Board, BoardWithAds } from "@/types/boards";
import type { Asset } from "@/types/assets";
import type { VariationWithContext } from "@/lib/data/variations";

// ─── Fetch All Workspace Variations (History) ──────────────────────────────

export async function fetchAllVariations(): Promise<{
  data?: VariationWithContext[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const variations = await getAllVariations(workspace.id, 100);
  return { data: variations };
}

// ─── Fetch Boards for Competitor Selection ─────────────────────────────────

export async function fetchBoardsForSelection(): Promise<{
  data?: Board[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const boards = await getBoards(workspace.id);
  return { data: boards };
}

// ─── Fetch Board Ads for Competitor Selection ──────────────────────────────

const fetchBoardAdsSchema = z.object({
  boardId: z.string().uuid(),
});

export async function fetchBoardAds(
  input: z.input<typeof fetchBoardAdsSchema>
): Promise<{ data?: BoardWithAds; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = fetchBoardAdsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const board = await getBoardWithAds(workspace.id, parsed.data.boardId);
  if (!board) return { error: "Board not found" };

  return { data: board };
}

// ─── Fetch Assets ──────────────────────────────────────────────────────────

export async function fetchAssetsForVariation(
  search?: string
): Promise<{ data?: Asset[]; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const assets = await getAssets(workspace.id, search);
  return { data: assets };
}

// ─── Delete Variation ──────────────────────────────────────────────────────

const deleteVariationSchema = z.object({
  variationId: z.string().uuid(),
});

export async function deleteVariationFromHistory(
  input: z.input<typeof deleteVariationSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteVariationSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteVariation(workspace.id, parsed.data.variationId);
}
