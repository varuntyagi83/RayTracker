import { db } from "@/lib/db";
import { boards, savedAds } from "@/db/schema";
import { eq, and, desc, count, inArray, isNotNull } from "drizzle-orm";
import type { Board, BoardWithAds, SavedAd } from "@/types/boards";

// ─── List Boards ────────────────────────────────────────────────────────────

export async function getBoards(workspaceId: string): Promise<Board[]> {
  // Single query: boards with ad count via left join + groupBy
  const rows = await db
    .select({
      id: boards.id,
      name: boards.name,
      description: boards.description,
      createdAt: boards.createdAt,
      updatedAt: boards.updatedAt,
      adCount: count(savedAds.id),
    })
    .from(boards)
    .leftJoin(savedAds, eq(savedAds.boardId, boards.id))
    .where(eq(boards.workspaceId, workspaceId))
    .groupBy(boards.id)
    .orderBy(desc(boards.createdAt));

  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    adCount: b.adCount,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));
}

// ─── Get Single Board with Ads ──────────────────────────────────────────────

export async function getBoardWithAds(
  workspaceId: string,
  boardId: string
): Promise<BoardWithAds | null> {
  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.workspaceId, workspaceId)))
    .limit(1);

  if (!board) return null;

  const ads = await db
    .select()
    .from(savedAds)
    .where(and(eq(savedAds.boardId, boardId), eq(savedAds.workspaceId, workspaceId)))
    .orderBy(desc(savedAds.createdAt));

  const mappedAds: SavedAd[] = ads.map((a) => ({
    id: a.id,
    boardId: a.boardId,
    source: a.source,
    metaLibraryId: a.metaLibraryId,
    brandName: a.brandName,
    headline: a.headline,
    body: a.body,
    format: a.format,
    imageUrl: a.imageUrl,
    videoUrl: a.videoUrl,
    landingPageUrl: a.landingPageUrl,
    platforms: a.platforms,
    startDate: a.startDate,
    runtimeDays: a.runtimeDays,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    id: board.id,
    name: board.name,
    description: board.description,
    adCount: mappedAds.length,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    ads: mappedAds,
  };
}

// ─── Create Board ───────────────────────────────────────────────────────────

export async function createBoard(
  workspaceId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(boards)
      .values({ workspaceId, name, description: description || null })
      .returning({ id: boards.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Update Board ───────────────────────────────────────────────────────────

export async function updateBoard(
  workspaceId: string,
  boardId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(boards)
      .set({ name, description: description || null, updatedAt: new Date() })
      .where(and(eq(boards.id, boardId), eq(boards.workspaceId, workspaceId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete Board ───────────────────────────────────────────────────────────

export async function deleteBoard(
  workspaceId: string,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(boards)
      .where(and(eq(boards.id, boardId), eq(boards.workspaceId, workspaceId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Remove Ad from Board ───────────────────────────────────────────────────

export async function removeAdFromBoard(
  workspaceId: string,
  adId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(savedAds)
      .where(and(eq(savedAds.id, adId), eq(savedAds.workspaceId, workspaceId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Get Board Thumbnail (first 4 ad images) ───────────────────────────────

export async function getBoardThumbnails(
  workspaceId: string,
  boardIds: string[]
): Promise<Record<string, string[]>> {
  if (boardIds.length === 0) return {};

  const rows = await db
    .select({ boardId: savedAds.boardId, imageUrl: savedAds.imageUrl })
    .from(savedAds)
    .where(
      and(
        inArray(savedAds.boardId, boardIds),
        eq(savedAds.workspaceId, workspaceId),
        isNotNull(savedAds.imageUrl)
      )
    )
    .orderBy(desc(savedAds.createdAt));

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!row.imageUrl) continue;
    if (!result[row.boardId]) result[row.boardId] = [];
    if (result[row.boardId].length < 4) {
      result[row.boardId].push(row.imageUrl);
    }
  }
  return result;
}
