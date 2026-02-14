import { createAdminClient } from "@/lib/supabase/admin";
import type { Asset } from "@/types/assets";

const STORAGE_BUCKET = "assets";

// ─── List Assets ────────────────────────────────────────────────────────────

export async function getAssets(
  workspaceId: string,
  search?: string
): Promise<Asset[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("assets")
    .select("id, name, description, image_url, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data } = await query;

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    imageUrl: a.image_url,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
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
    .select("id, name, description, image_url, created_at, updated_at")
    .eq("id", assetId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
  description?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspaceId,
      name,
      image_url: imageUrl,
      description: description || null,
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
  imageUrl?: string
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
