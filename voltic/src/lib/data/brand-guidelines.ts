import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandGuidelines, BrandGuidelineFile } from "@/types/variations";

const STORAGE_BUCKET = "brand-assets";

// ─── Get Brand Guidelines ───────────────────────────────────────────────────

export async function getBrandGuidelines(
  workspaceId: string
): Promise<BrandGuidelines> {
  const supabase = createAdminClient();

  // 1. Try new brand_guidelines table (default entity)
  const { data: entity } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .single();

  if (entity) {
    // Convert entity to legacy BrandGuidelines shape
    const palette = Array.isArray(entity.color_palette)
      ? (entity.color_palette as Array<{ hex: string; name: string }>)
          .map((c) => c.hex)
          .join(", ")
      : undefined;

    return {
      brandName: entity.brand_name ?? undefined,
      brandVoice: entity.brand_voice ?? undefined,
      colorPalette: palette,
      targetAudience: entity.target_audience ?? undefined,
      dosAndDonts: entity.dos_and_donts ?? undefined,
      files: (entity.files as BrandGuidelineFile[]) ?? [],
    };
  }

  // 2. Fallback: workspace settings JSONB (legacy)
  const { data } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (data?.settings ?? {}) as Record<string, any>;
  return (settings.brandGuidelines ?? {}) as BrandGuidelines;
}

// ─── Update Brand Guidelines (text fields) ──────────────────────────────────

export async function updateBrandGuidelines(
  workspaceId: string,
  guidelines: Omit<BrandGuidelines, "files">
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Fetch current settings to merge
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = (workspace?.settings ?? {}) as Record<string, any>;
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      ...guidelines,
    },
  };

  const { error } = await supabase
    .from("workspaces")
    .update({ settings: updatedSettings })
    .eq("id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Upload Brand Asset File ────────────────────────────────────────────────

export async function uploadBrandAsset(
  workspaceId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
  fileSize: number
): Promise<{ success: boolean; file?: BrandGuidelineFile; error?: string }> {
  const supabase = createAdminClient();

  const path = `${workspaceId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const fileRecord: BrandGuidelineFile = {
    name: fileName,
    url: publicUrl,
    path,
    size: fileSize,
    type: contentType,
    uploadedAt: new Date().toISOString(),
  };

  // Add file to workspace settings
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = (workspace?.settings ?? {}) as Record<string, any>;
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;
  const currentFiles = currentGuidelines.files ?? [];

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      files: [...currentFiles, fileRecord],
    },
  };

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ settings: updatedSettings })
    .eq("id", workspaceId);

  if (updateError) {
    // Clean up uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    return { success: false, error: updateError.message };
  }

  return { success: true, file: fileRecord };
}

// ─── Delete Brand Asset File ────────────────────────────────────────────────

export async function deleteBrandAsset(
  workspaceId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Remove from storage
  await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

  // Remove from workspace settings
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = (workspace?.settings ?? {}) as Record<string, any>;
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;
  const currentFiles = currentGuidelines.files ?? [];

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      files: currentFiles.filter((f) => f.path !== filePath),
    },
  };

  const { error } = await supabase
    .from("workspaces")
    .update({ settings: updatedSettings })
    .eq("id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
