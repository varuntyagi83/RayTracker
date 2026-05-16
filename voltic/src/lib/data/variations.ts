import { db } from "@/lib/db";
import { variations, savedAds, assets } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import type {
  Variation,
  VariationStrategy,
  VariationSource,
  CreativeOptions,
} from "@/types/variations";

// ─── Get Variations for a Saved Ad ──────────────────────────────────────────

export async function getVariationsForAd(
  workspaceId: string,
  savedAdId: string
): Promise<Variation[]> {
  const rows = await db
    .select()
    .from(variations)
    .where(and(eq(variations.workspaceId, workspaceId), eq(variations.savedAdId, savedAdId)))
    .orderBy(desc(variations.createdAt));

  return rows.map(mapRow);
}

// ─── Get Single Variation ───────────────────────────────────────────────────

export async function getVariation(
  workspaceId: string,
  variationId: string
): Promise<Variation | null> {
  const [row] = await db
    .select()
    .from(variations)
    .where(and(eq(variations.id, variationId), eq(variations.workspaceId, workspaceId)))
    .limit(1);

  return row ? mapRow(row) : null;
}

// ─── Create Variation Record ────────────────────────────────────────────────

export async function createVariation(
  workspaceId: string,
  assetId: string,
  strategy: VariationStrategy,
  creditsUsed: number,
  source: VariationSource,
  savedAdId?: string,
  creativeOptions?: CreativeOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(variations)
      .values({
        workspaceId,
        savedAdId: savedAdId ?? null,
        assetId,
        source,
        strategy,
        creativeOptions: creativeOptions ?? null,
        creditsUsed,
        status: "pending",
      })
      .returning({ id: variations.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Update Variation with Generated Content ────────────────────────────────

export async function completeVariation(
  workspaceId: string,
  variationId: string,
  content: {
    generatedHeadline?: string;
    generatedBody?: string;
    generatedImageUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updated = await db
      .update(variations)
      .set({
        generatedHeadline: content.generatedHeadline ?? null,
        generatedBody: content.generatedBody ?? null,
        generatedImageUrl: content.generatedImageUrl ?? null,
        status: "completed",
      })
      .where(and(eq(variations.id, variationId), eq(variations.workspaceId, workspaceId)))
      .returning({ id: variations.id });

    if (!updated.length) return { success: false, error: "Variation not found" };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Mark Variation as Failed ───────────────────────────────────────────────

export async function failVariation(
  workspaceId: string,
  variationId: string
): Promise<void> {
  await db
    .update(variations)
    .set({ status: "failed" })
    .where(and(eq(variations.id, variationId), eq(variations.workspaceId, workspaceId)));
}

// ─── Delete Variation ───────────────────────────────────────────────────────

export async function deleteVariation(
  workspaceId: string,
  variationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(variations)
      .where(and(eq(variations.id, variationId), eq(variations.workspaceId, workspaceId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Get All Variations for Workspace ──────────────────────────────────────

export interface VariationWithContext extends Variation {
  adBrandName: string | null;
  adImageUrl: string | null;
  assetName: string | null;
  assetImageUrl: string | null;
}

export async function getAllVariations(
  workspaceId: string,
  limit: number = 20,
  cursor?: string // ISO timestamp — fetch variations created before this time
): Promise<VariationWithContext[]> {
  const conditions = [eq(variations.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(lt(variations.createdAt, new Date(cursor)));
  }

  const rows = await db
    .select({
      // variation columns
      id: variations.id,
      savedAdId: variations.savedAdId,
      assetId: variations.assetId,
      source: variations.source,
      strategy: variations.strategy,
      creativeOptions: variations.creativeOptions,
      generatedImageUrl: variations.generatedImageUrl,
      generatedHeadline: variations.generatedHeadline,
      generatedBody: variations.generatedBody,
      creditsUsed: variations.creditsUsed,
      status: variations.status,
      createdAt: variations.createdAt,
      // joined context from saved_ads (optional)
      adBrandName: savedAds.brandName,
      adImageUrl: savedAds.imageUrl,
      // joined context from assets (required — inner join equivalent via notNull filter)
      assetName: assets.name,
      assetImageUrl: assets.imageUrl,
    })
    .from(variations)
    .leftJoin(savedAds, eq(variations.savedAdId, savedAds.id))
    .innerJoin(assets, eq(variations.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(desc(variations.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    savedAdId: row.savedAdId ?? null,
    assetId: row.assetId,
    source: row.source as VariationSource,
    strategy: row.strategy as VariationStrategy,
    creativeOptions: row.creativeOptions as CreativeOptions | null,
    generatedImageUrl: row.generatedImageUrl,
    generatedHeadline: row.generatedHeadline,
    generatedBody: row.generatedBody,
    creditsUsed: row.creditsUsed,
    status: row.status as "pending" | "completed" | "failed",
    createdAt: row.createdAt.toISOString(),
    adBrandName: row.adBrandName ?? null,
    adImageUrl: row.adImageUrl ?? null,
    assetName: row.assetName ?? null,
    assetImageUrl: row.assetImageUrl ?? null,
  }));
}

// ─── Map DB row ─────────────────────────────────────────────────────────────

function mapRow(row: typeof variations.$inferSelect): Variation {
  return {
    id: row.id,
    savedAdId: row.savedAdId ?? null,
    assetId: row.assetId,
    source: row.source as VariationSource,
    strategy: row.strategy as VariationStrategy,
    creativeOptions: row.creativeOptions as CreativeOptions | null,
    generatedImageUrl: row.generatedImageUrl,
    generatedHeadline: row.generatedHeadline,
    generatedBody: row.generatedBody,
    creditsUsed: row.creditsUsed,
    status: row.status as "pending" | "completed" | "failed",
    createdAt: row.createdAt.toISOString(),
  };
}
