import { uploadBrandAsset, deleteBrandAsset } from "@/lib/storage/brand-assets";
import { db } from "@/lib/db";
import { assets, brandGuidelinesTable } from "@/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import type { Asset } from "@/types/assets";

// ─── List Assets ────────────────────────────────────────────────────────────

export async function getAssets(
  workspaceId: string,
  search?: string,
  brandGuidelineId?: string
): Promise<Asset[]> {
  const conditions = [eq(assets.workspaceId, workspaceId)];

  if (search?.trim()) {
    conditions.push(ilike(assets.name, `%${search.trim()}%`));
  }

  if (brandGuidelineId) {
    conditions.push(eq(assets.brandGuidelineId, brandGuidelineId));
  }

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      description: assets.description,
      imageUrl: assets.imageUrl,
      brandGuidelineId: assets.brandGuidelineId,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      brandGuidelineName: brandGuidelinesTable.name,
    })
    .from(assets)
    .leftJoin(brandGuidelinesTable, eq(assets.brandGuidelineId, brandGuidelinesTable.id))
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt));

  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    imageUrl: a.imageUrl,
    brandGuidelineId: a.brandGuidelineId,
    brandGuidelineName: a.brandGuidelineName ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

// ─── Get Single Asset ───────────────────────────────────────────────────────

export async function getAsset(
  workspaceId: string,
  assetId: string
): Promise<Asset | null> {
  const [row] = await db
    .select({
      id: assets.id,
      name: assets.name,
      description: assets.description,
      imageUrl: assets.imageUrl,
      brandGuidelineId: assets.brandGuidelineId,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      brandGuidelineName: brandGuidelinesTable.name,
    })
    .from(assets)
    .leftJoin(brandGuidelinesTable, eq(assets.brandGuidelineId, brandGuidelinesTable.id))
    .where(and(eq(assets.id, assetId), eq(assets.workspaceId, workspaceId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    brandGuidelineId: row.brandGuidelineId,
    brandGuidelineName: row.brandGuidelineName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Upload Image to R2 Storage ─────────────────────────────────────────────

export async function uploadAssetImage(
  workspaceId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ url?: string; error?: string }> {
  // Sanitize filename — same pattern as studio upload (M-12)
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const path = `${workspaceId}/assets/${Date.now()}-${safeFileName}`;

  try {
    const url = await uploadBrandAsset(path, fileBuffer, contentType);
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

// ─── Delete Image from Storage ──────────────────────────────────────────────

export async function deleteAssetImage(storagePath: string): Promise<void> {
  // Accept either a raw storage path or a full public URL; extract path if needed
  let path = storagePath;
  if (storagePath.startsWith("http")) {
    // Best-effort: strip everything up to and including the bucket name segment
    const marker = "/brand-assets/";
    const idx = storagePath.indexOf(marker);
    if (idx === -1) return;
    path = storagePath.slice(idx + marker.length);
  }
  await deleteBrandAsset(path);
}

// ─── Create Asset ───────────────────────────────────────────────────────────

export async function createAsset(
  workspaceId: string,
  name: string,
  imageUrl: string,
  description?: string,
  brandGuidelineId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(assets)
      .values({
        workspaceId,
        name,
        imageUrl,
        description: description || null,
        brandGuidelineId: brandGuidelineId || null,
      })
      .returning({ id: assets.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Update Asset ───────────────────────────────────────────────────────────

export async function updateAsset(
  workspaceId: string,
  assetId: string,
  name: string,
  description?: string,
  imageUrl?: string,
  brandGuidelineId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Partial<typeof assets.$inferInsert> = {
      name,
      description: description || null,
      updatedAt: new Date(),
    };

    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    if (brandGuidelineId !== undefined) {
      updateData.brandGuidelineId = brandGuidelineId || null;
    }

    await db
      .update(assets)
      .set(updateData)
      .where(and(eq(assets.id, assetId), eq(assets.workspaceId, workspaceId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete Asset ───────────────────────────────────────────────────────────

export async function deleteAsset(
  workspaceId: string,
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  // Get image URL first so we can clean up storage
  const asset = await getAsset(workspaceId, assetId);

  try {
    await db
      .delete(assets)
      .where(and(eq(assets.id, assetId), eq(assets.workspaceId, workspaceId)));
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Clean up storage (fire-and-forget)
  if (asset?.imageUrl) {
    deleteAssetImage(asset.imageUrl).catch(() => {});
  }

  return { success: true };
}
