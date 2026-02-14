"use server";

import { getWorkspace } from "@/lib/supabase/queries";
import { searchAdsLibrary, getWorkspaceBoards, saveAdToBoard } from "@/lib/data/discover";
import type { DiscoverSearchParams, DiscoverAd } from "@/types/discover";

export async function fetchDiscoverAds(params: DiscoverSearchParams) {
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
