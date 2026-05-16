import { db } from "@/lib/db";
import {
  generatedAds,
  brandGuidelinesTable,
  assets,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { uploadBrandAsset, deleteBrandAsset } from "@/lib/storage/brand-assets";
import type { GeneratedAd, TextPosition } from "@/types/ads";

// ─── List Generated Ads ────────────────────────────────────────────────────

export async function getGeneratedAds(
  workspaceId: string,
  filters?: { brandGuidelineId?: string }
): Promise<GeneratedAd[]> {
  const whereCondition = filters?.brandGuidelineId
    ? and(
        eq(generatedAds.workspaceId, workspaceId),
        eq(generatedAds.brandGuidelineId, filters.brandGuidelineId)
      )
    : eq(generatedAds.workspaceId, workspaceId);

  const rows = await db
    .select({
      id: generatedAds.id,
      workspaceId: generatedAds.workspaceId,
      brandGuidelineId: generatedAds.brandGuidelineId,
      brandGuidelineName: brandGuidelinesTable.name,
      backgroundAssetId: generatedAds.backgroundAssetId,
      backgroundAssetName: assets.name,
      textVariant: generatedAds.textVariant,
      fontFamily: generatedAds.fontFamily,
      fontSize: generatedAds.fontSize,
      textColor: generatedAds.textColor,
      textPosition: generatedAds.textPosition,
      imageUrl: generatedAds.imageUrl,
      storagePath: generatedAds.storagePath,
      width: generatedAds.width,
      height: generatedAds.height,
      status: generatedAds.status,
      createdAt: generatedAds.createdAt,
      updatedAt: generatedAds.updatedAt,
    })
    .from(generatedAds)
    .leftJoin(
      brandGuidelinesTable,
      eq(generatedAds.brandGuidelineId, brandGuidelinesTable.id)
    )
    .leftJoin(assets, eq(generatedAds.backgroundAssetId, assets.id))
    .where(whereCondition)
    .orderBy(desc(generatedAds.createdAt));

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    brandGuidelineId: row.brandGuidelineId,
    brandGuidelineName: row.brandGuidelineName ?? undefined,
    backgroundAssetId: row.backgroundAssetId,
    backgroundAssetName: row.backgroundAssetName ?? undefined,
    textVariant: row.textVariant,
    fontFamily: row.fontFamily,
    fontSize: row.fontSize,
    textColor: row.textColor,
    textPosition: row.textPosition as TextPosition,
    imageUrl: row.imageUrl,
    storagePath: row.storagePath,
    width: row.width ?? null,
    height: row.height ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }));
}

// ─── Get Single Generated Ad ───────────────────────────────────────────────

export async function getGeneratedAd(
  workspaceId: string,
  adId: string
): Promise<GeneratedAd | null> {
  const [row] = await db
    .select({
      id: generatedAds.id,
      workspaceId: generatedAds.workspaceId,
      brandGuidelineId: generatedAds.brandGuidelineId,
      brandGuidelineName: brandGuidelinesTable.name,
      backgroundAssetId: generatedAds.backgroundAssetId,
      backgroundAssetName: assets.name,
      textVariant: generatedAds.textVariant,
      fontFamily: generatedAds.fontFamily,
      fontSize: generatedAds.fontSize,
      textColor: generatedAds.textColor,
      textPosition: generatedAds.textPosition,
      imageUrl: generatedAds.imageUrl,
      storagePath: generatedAds.storagePath,
      width: generatedAds.width,
      height: generatedAds.height,
      status: generatedAds.status,
      createdAt: generatedAds.createdAt,
      updatedAt: generatedAds.updatedAt,
    })
    .from(generatedAds)
    .leftJoin(
      brandGuidelinesTable,
      eq(generatedAds.brandGuidelineId, brandGuidelinesTable.id)
    )
    .leftJoin(assets, eq(generatedAds.backgroundAssetId, assets.id))
    .where(and(eq(generatedAds.workspaceId, workspaceId), eq(generatedAds.id, adId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    brandGuidelineId: row.brandGuidelineId,
    brandGuidelineName: row.brandGuidelineName ?? undefined,
    backgroundAssetId: row.backgroundAssetId,
    backgroundAssetName: row.backgroundAssetName ?? undefined,
    textVariant: row.textVariant,
    fontFamily: row.fontFamily,
    fontSize: row.fontSize,
    textColor: row.textColor,
    textPosition: row.textPosition as TextPosition,
    imageUrl: row.imageUrl,
    storagePath: row.storagePath,
    width: row.width ?? null,
    height: row.height ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  };
}

// ─── Create Single Generated Ad ────────────────────────────────────────────

export async function createGeneratedAd(
  workspaceId: string,
  ad: {
    brandGuidelineId: string;
    backgroundAssetId: string;
    textVariant: string;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    textPosition: TextPosition;
    imageUrl: string;
    storagePath: string;
    width?: number;
    height?: number;
    status?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(generatedAds)
      .values({
        workspaceId,
        brandGuidelineId: ad.brandGuidelineId,
        backgroundAssetId: ad.backgroundAssetId,
        textVariant: ad.textVariant,
        fontFamily: ad.fontFamily,
        fontSize: ad.fontSize,
        textColor: ad.textColor,
        textPosition: ad.textPosition,
        imageUrl: ad.imageUrl,
        storagePath: ad.storagePath,
        width: ad.width ?? null,
        height: ad.height ?? null,
        status: ad.status ?? "approved",
      })
      .returning({ id: generatedAds.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Batch Create Generated Ads ────────────────────────────────────────────

export async function createGeneratedAdsBatch(
  workspaceId: string,
  ads: Array<{
    brandGuidelineId: string;
    backgroundAssetId: string;
    textVariant: string;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    textPosition: TextPosition;
    imageUrl: string;
    storagePath: string;
    width?: number;
    height?: number;
    status?: string;
  }>
): Promise<{ success: boolean; ids?: string[]; error?: string }> {
  try {
    const values = ads.map((ad) => ({
      workspaceId,
      brandGuidelineId: ad.brandGuidelineId,
      backgroundAssetId: ad.backgroundAssetId,
      textVariant: ad.textVariant,
      fontFamily: ad.fontFamily,
      fontSize: ad.fontSize,
      textColor: ad.textColor,
      textPosition: ad.textPosition,
      imageUrl: ad.imageUrl,
      storagePath: ad.storagePath,
      width: ad.width ?? null,
      height: ad.height ?? null,
      status: ad.status ?? "approved",
    }));

    const inserted = await db
      .insert(generatedAds)
      .values(values)
      .returning({ id: generatedAds.id });

    return { success: true, ids: inserted.map((r) => r.id) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Delete Generated Ad ───────────────────────────────────────────────────

export async function deleteGeneratedAd(
  workspaceId: string,
  adId: string
): Promise<{ success: boolean; error?: string }> {
  // Get the ad first for storage cleanup
  const ad = await getGeneratedAd(workspaceId, adId);

  try {
    await db
      .delete(generatedAds)
      .where(and(eq(generatedAds.workspaceId, workspaceId), eq(generatedAds.id, adId)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }

  // Clean up storage
  if (ad?.storagePath) {
    await deleteBrandAsset(ad.storagePath).catch(() => {});
  }

  return { success: true };
}

// ─── Upload Ad Image ───────────────────────────────────────────────────────

export async function uploadAdImage(
  workspaceId: string,
  buffer: Buffer,
  fileName: string
): Promise<{ url: string; path: string } | { error: string }> {
  const storagePath = `${workspaceId}/ads/${Date.now()}-${fileName}`;

  try {
    const url = await uploadBrandAsset(storagePath, buffer, "image/png");
    return { url, path: storagePath };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}
