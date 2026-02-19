import { createAdminClient } from "@/lib/supabase/admin";
import type { Asset } from "@/types/assets";

const STORAGE_BUCKET = "asset";

// ─── List Assets ────────────────────────────────────────────────────────────

export async function getAssets(
  workspaceId: string,
  search?: string,
  brandGuidelineId?: string
): Promise<Asset[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("assets")
    .select("id, name, description, image_url, brand_guideline_id, created_at, updated_at, brand_guidelines(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  if (brandGuidelineId) {
    query = query.eq("brand_guideline_id", brandGuidelineId);
  }

  const { data } = await query;

  return (data ?? []).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    name: a.name as string,
    description: a.description as string | null,
    imageUrl: a.image_url as string,
    brandGuidelineId: a.brand_guideline_id as string | null,
    brandGuidelineName: (a.brand_guidelines as Record<string, unknown> | null)?.name as string | null ?? null,
    createdAt: a.created_at as string,
    updatedAt: a.updated_at as string,
  }));
}

// ─── Get Single Asset ───────────────────────────────────────────────────────

export async function getAsset(
  workspaceId: string,
  assetId: string
): Promise<Asset | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("assets")
    .select("id, name, description, image_url, brand_guideline_id, created_at, updated_at, brand_guidelines(name)")
    .eq("id", assetId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    imageUrl: row.image_url as string,
    brandGuidelineId: row.brand_guideline_id as string | null,
    brandGuidelineName: (row.brand_guidelines as Record<string, unknown> | null)?.name as string | null ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Upload Image to Supabase Storage ───────────────────────────────────────

export async function uploadAssetImage(
  workspaceId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ url?: string; error?: string }> {
  const supabase = createAdminClient();

  const path = `${workspaceId}/${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}

// ─── Delete Image from Storage ──────────────────────────────────────────────

export async function deleteAssetImage(imageUrl: string): Promise<void> {
  const supabase = createAdminClient();

  // Extract path from public URL
  const bucketPrefix = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = imageUrl.indexOf(bucketPrefix);
  if (idx === -1) return;

  const path = imageUrl.slice(idx + bucketPrefix.length);
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

// ─── Create Asset ───────────────────────────────────────────────────────────

export async function createAsset(
  workspaceId: string,
  name: string,
  imageUrl: string,
  description?: string,
  brandGuidelineId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspaceId,
      name,
      image_url: imageUrl,
      description: description || null,
      brand_guideline_id: brandGuidelineId || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
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
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    name,
    description: description || null,
    updated_at: new Date().toISOString(),
  };

  if (imageUrl) {
    updateData.image_url = imageUrl;
  }

  if (brandGuidelineId !== undefined) {
    updateData.brand_guideline_id = brandGuidelineId || null;
  }

  const { error } = await supabase
    .from("assets")
    .update(updateData)
    .eq("id", assetId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Delete Asset ───────────────────────────────────────────────────────────

export async function deleteAsset(
  workspaceId: string,
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Get image URL first so we can clean up storage
  const asset = await getAsset(workspaceId, assetId);

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };

  // Clean up storage (fire-and-forget)
  if (asset?.imageUrl) {
    deleteAssetImage(asset.imageUrl).catch(() => {});
  }

  return { success: true };
}
