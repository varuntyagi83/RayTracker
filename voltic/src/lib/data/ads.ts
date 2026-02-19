import { createAdminClient, ensureStorageBucket } from "@/lib/supabase/admin";
import type { GeneratedAd, TextPosition } from "@/types/ads";

const STORAGE_BUCKET = "brand-assets";

// ─── List Generated Ads ────────────────────────────────────────────────────

export async function getGeneratedAds(
  workspaceId: string,
  filters?: { brandGuidelineId?: string }
): Promise<GeneratedAd[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("generated_ads")
    .select(
      "*, brand_guidelines(name), assets!generated_ads_background_asset_id_fkey(name)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (filters?.brandGuidelineId) {
    query = query.eq("brand_guideline_id", filters.brandGuidelineId);
  }

  const { data } = await query;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    brandGuidelineId: row.brand_guideline_id as string,
    brandGuidelineName:
      (row.brand_guidelines as Record<string, unknown> | null)?.name as
        | string
        | undefined,
    backgroundAssetId: row.background_asset_id as string,
    backgroundAssetName:
      (row.assets as Record<string, unknown> | null)?.name as
        | string
        | undefined,
    textVariant: row.text_variant as string,
    fontFamily: row.font_family as string,
    fontSize: row.font_size as number,
    textColor: row.text_color as string,
    textPosition: row.text_position as TextPosition,
    imageUrl: row.image_url as string,
    storagePath: row.storage_path as string,
    width: row.width as number | null,
    height: row.height as number | null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ─── Get Single Generated Ad ───────────────────────────────────────────────

export async function getGeneratedAd(
  workspaceId: string,
  adId: string
): Promise<GeneratedAd | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("generated_ads")
    .select(
      "*, brand_guidelines(name), assets!generated_ads_background_asset_id_fkey(name)"
    )
    .eq("workspace_id", workspaceId)
    .eq("id", adId)
    .single();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    brandGuidelineId: row.brand_guideline_id as string,
    brandGuidelineName:
      (row.brand_guidelines as Record<string, unknown> | null)?.name as
        | string
        | undefined,
    backgroundAssetId: row.background_asset_id as string,
    backgroundAssetName:
      (row.assets as Record<string, unknown> | null)?.name as
        | string
        | undefined,
    textVariant: row.text_variant as string,
    fontFamily: row.font_family as string,
    fontSize: row.font_size as number,
    textColor: row.text_color as string,
    textPosition: row.text_position as TextPosition,
    imageUrl: row.image_url as string,
    storagePath: row.storage_path as string,
    width: row.width as number | null,
    height: row.height as number | null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("generated_ads")
    .insert({
      workspace_id: workspaceId,
      brand_guideline_id: ad.brandGuidelineId,
      background_asset_id: ad.backgroundAssetId,
      text_variant: ad.textVariant,
      font_family: ad.fontFamily,
      font_size: ad.fontSize,
      text_color: ad.textColor,
      text_position: ad.textPosition,
      image_url: ad.imageUrl,
      storage_path: ad.storagePath,
      width: ad.width ?? null,
      height: ad.height ?? null,
      status: ad.status ?? "approved",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
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
  const supabase = createAdminClient();

  const rows = ads.map((ad) => ({
    workspace_id: workspaceId,
    brand_guideline_id: ad.brandGuidelineId,
    background_asset_id: ad.backgroundAssetId,
    text_variant: ad.textVariant,
    font_family: ad.fontFamily,
    font_size: ad.fontSize,
    text_color: ad.textColor,
    text_position: ad.textPosition,
    image_url: ad.imageUrl,
    storage_path: ad.storagePath,
    width: ad.width ?? null,
    height: ad.height ?? null,
    status: ad.status ?? "approved",
  }));

  const { data, error } = await supabase
    .from("generated_ads")
    .insert(rows)
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, ids: data.map((d) => d.id) };
}

// ─── Delete Generated Ad ───────────────────────────────────────────────────

export async function deleteGeneratedAd(
  workspaceId: string,
  adId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Get the ad first for storage cleanup
  const ad = await getGeneratedAd(workspaceId, adId);

  const { error } = await supabase
    .from("generated_ads")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", adId);

  if (error) return { success: false, error: error.message };

  // Clean up storage
  if (ad?.storagePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([ad.storagePath]);
  }

  return { success: true };
}

// ─── Upload Ad Image ───────────────────────────────────────────────────────

export async function uploadAdImage(
  workspaceId: string,
  buffer: Buffer,
  fileName: string
): Promise<{ url: string; path: string } | { error: string }> {
  await ensureStorageBucket();
  const supabase = createAdminClient();
  const storagePath = `${workspaceId}/ads/${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return { url: publicUrl, path: storagePath };
}
