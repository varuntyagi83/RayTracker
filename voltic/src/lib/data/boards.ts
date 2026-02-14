import { createAdminClient } from "@/lib/supabase/admin";
import type { Board, BoardWithAds, SavedAd } from "@/types/boards";

// ─── List Boards ────────────────────────────────────────────────────────────

export async function getBoards(workspaceId: string): Promise<Board[]> {
  const supabase = createAdminClient();

  // Fetch boards with ad count via left join
  const { data: boards } = await supabase
    .from("boards")
    .select("id, name, description, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (!boards || boards.length === 0) return [];

  // Get counts per board
  const boardIds = boards.map((b) => b.id);
  const { data: countRows } = await supabase
    .from("saved_ads")
    .select("board_id")
    .in("board_id", boardIds);

  const countMap: Record<string, number> = {};
  for (const row of countRows ?? []) {
    countMap[row.board_id] = (countMap[row.board_id] ?? 0) + 1;
  }

  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    adCount: countMap[b.id] ?? 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }));
}

// ─── Get Single Board with Ads ──────────────────────────────────────────────

export async function getBoardWithAds(
  workspaceId: string,
  boardId: string
): Promise<BoardWithAds | null> {
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, description, created_at, updated_at")
    .eq("id", boardId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!board) return null;

  const { data: ads } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("board_id", boardId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const mappedAds: SavedAd[] = (ads ?? []).map((a) => ({
    id: a.id,
    boardId: a.board_id,
    source: a.source,
    metaLibraryId: a.meta_library_id,
    brandName: a.brand_name,
    headline: a.headline,
    body: a.body,
    format: a.format,
    imageUrl: a.image_url,
    videoUrl: a.video_url,
    landingPageUrl: a.landing_page_url,
    platforms: a.platforms,
    startDate: a.start_date,
    runtimeDays: a.runtime_days,
    createdAt: a.created_at,
  }));

  return {
    id: board.id,
    name: board.name,
    description: board.description,
    adCount: mappedAds.length,
    createdAt: board.created_at,
    updatedAt: board.updated_at,
    ads: mappedAds,
  };
}

// ─── Create Board ───────────────────────────────────────────────────────────

export async function createBoard(
  workspaceId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("boards")
    .insert({
      workspace_id: workspaceId,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

// ─── Update Board ───────────────────────────────────────────────────────────

export async function updateBoard(
  workspaceId: string,
  boardId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("boards")
    .update({
      name,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boardId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Delete Board ───────────────────────────────────────────────────────────

export async function deleteBoard(
  workspaceId: string,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Remove Ad from Board ───────────────────────────────────────────────────

export async function removeAdFromBoard(
  workspaceId: string,
  adId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("saved_ads")
    .delete()
    .eq("id", adId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Get Board Thumbnail (first 4 ad images) ───────────────────────────────

export async function getBoardThumbnails(
  workspaceId: string,
  boardIds: string[]
): Promise<Record<string, string[]>> {
  if (boardIds.length === 0) return {};

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("saved_ads")
    .select("board_id, image_url")
    .in("board_id", boardIds)
    .eq("workspace_id", workspaceId)
    .not("image_url", "is", null)
    .order("created_at", { ascending: false });

  const result: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!result[row.board_id]) result[row.board_id] = [];
    if (result[row.board_id].length < 4) {
      result[row.board_id].push(row.image_url!);
    }
  }
  return result;
}
