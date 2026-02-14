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
import type { Board, BoardWithAds } from "@/types/boards";

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
