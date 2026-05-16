import { db } from "@/lib/db";
import { brandGuidelinesTable, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { BrandGuidelines, BrandGuidelineFile } from "@/types/variations";
import {
  uploadBrandAsset as uploadToR2,
  deleteBrandAsset as deleteFromR2,
} from "@/lib/storage/brand-assets";

// ─── Get Brand Guidelines ───────────────────────────────────────────────────

export async function getBrandGuidelines(
  workspaceId: string
): Promise<BrandGuidelines> {
  // 1. Try new brand_guidelines table (default entity)
  const [entity] = await db
    .select()
    .from(brandGuidelinesTable)
    .where(
      and(
        eq(brandGuidelinesTable.workspaceId, workspaceId),
        eq(brandGuidelinesTable.isDefault, true)
      )
    )
    .limit(1);

  if (entity) {
    // Convert entity to legacy BrandGuidelines shape
    const palette = Array.isArray(entity.colorPalette)
      ? (entity.colorPalette as Array<{ hex: string; name: string }>)
          .map((c) => c.hex)
          .join(", ")
      : undefined;

    return {
      brandName: entity.brandName ?? undefined,
      brandVoice: entity.brandVoice ?? undefined,
      colorPalette: palette,
      targetAudience: entity.targetAudience ?? undefined,
      dosAndDonts: entity.dosAndDonts ?? undefined,
      files: (entity.files as BrandGuidelineFile[]) ?? [],
    };
  }

  // 2. Fallback: workspace settings JSONB (legacy)
  const [workspace] = await db
    .select({ settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = ((workspace?.settings ?? {}) as Record<string, any>);
  return (settings.brandGuidelines ?? {}) as BrandGuidelines;
}

// ─── Update Brand Guidelines (text fields) ──────────────────────────────────

export async function updateBrandGuidelines(
  workspaceId: string,
  guidelines: Omit<BrandGuidelines, "files">
): Promise<{ success: boolean; error?: string }> {
  // Fetch current settings to merge
  const [workspace] = await db
    .select({ settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = ((workspace?.settings ?? {}) as Record<string, any>);
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      ...guidelines,
    },
  };

  try {
    await db
      .update(workspaces)
      .set({ settings: updatedSettings })
      .where(eq(workspaces.id, workspaceId));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Upload Brand Asset File ────────────────────────────────────────────────

export async function uploadBrandAsset(
  workspaceId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
  fileSize: number
): Promise<{ success: boolean; file?: BrandGuidelineFile; error?: string }> {
  const path = `${workspaceId}/${Date.now()}-${fileName}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(path, fileBuffer, contentType);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  const fileRecord: BrandGuidelineFile = {
    name: fileName,
    url: publicUrl,
    path,
    size: fileSize,
    type: contentType,
    uploadedAt: new Date().toISOString(),
  };

  // Add file to workspace settings
  const [workspace] = await db
    .select({ settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = ((workspace?.settings ?? {}) as Record<string, any>);
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;
  const currentFiles = currentGuidelines.files ?? [];

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      files: [...currentFiles, fileRecord],
    },
  };

  try {
    await db
      .update(workspaces)
      .set({ settings: updatedSettings })
      .where(eq(workspaces.id, workspaceId));
    return { success: true, file: fileRecord };
  } catch (err) {
    await deleteFromR2(path).catch(() => {});
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete Brand Asset File ────────────────────────────────────────────────

export async function deleteBrandAsset(
  workspaceId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  await deleteFromR2(filePath).catch(() => {});

  // Remove from workspace settings
  const [workspace] = await db
    .select({ settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSettings = ((workspace?.settings ?? {}) as Record<string, any>);
  const currentGuidelines = (currentSettings.brandGuidelines ?? {}) as BrandGuidelines;
  const currentFiles = currentGuidelines.files ?? [];

  const updatedSettings = {
    ...currentSettings,
    brandGuidelines: {
      ...currentGuidelines,
      files: currentFiles.filter((f) => f.path !== filePath),
    },
  };

  try {
    await db
      .update(workspaces)
      .set({ settings: updatedSettings })
      .where(eq(workspaces.id, workspaceId));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
