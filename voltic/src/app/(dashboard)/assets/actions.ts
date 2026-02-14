"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  uploadAssetImage,
  deleteAssetImage,
} from "@/lib/data/assets";
import type { Asset } from "@/types/assets";

// ─── Fetch All Assets ───────────────────────────────────────────────────────

export async function fetchAssets(
  search?: string
): Promise<{ data?: Asset[]; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const assets = await getAssets(workspace.id, search);
  return { data: assets };
}

// ─── Upload Image + Create Asset ────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function createAssetAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const file = formData.get("image") as File | null;

  if (!name?.trim()) return { success: false, error: "Name is required" };
  if (!file || file.size === 0) return { success: false, error: "Image is required" };
  if (file.size > MAX_FILE_SIZE) return { success: false, error: "Image must be under 5MB" };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, WebP, and GIF images are allowed" };
  }

  // Upload image
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await uploadAssetImage(workspace.id, file.name, buffer, file.type);
  if (upload.error || !upload.url) {
    return { success: false, error: upload.error ?? "Upload failed" };
  }

  // Create asset record
  const result = await createAsset(workspace.id, name.trim(), upload.url, description?.trim());
  if (!result.success) {
    // Clean up uploaded image
    await deleteAssetImage(upload.url).catch(() => {});
  }
  return result;
}

// ─── Update Asset ───────────────────────────────────────────────────────────

export async function updateAssetAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const assetId = formData.get("assetId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const file = formData.get("image") as File | null;

  if (!assetId) return { success: false, error: "Asset ID is required" };
  if (!name?.trim()) return { success: false, error: "Name is required" };

  let newImageUrl: string | undefined;

  // If a new image was uploaded, handle it
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) return { success: false, error: "Image must be under 5MB" };
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Only JPG, PNG, WebP, and GIF images are allowed" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadAssetImage(workspace.id, file.name, buffer, file.type);
    if (upload.error || !upload.url) {
      return { success: false, error: upload.error ?? "Upload failed" };
    }
    newImageUrl = upload.url;

    // Delete old image (fire-and-forget)
    const existing = await getAsset(workspace.id, assetId);
    if (existing?.imageUrl) {
      deleteAssetImage(existing.imageUrl).catch(() => {});
    }
  }

  return await updateAsset(
    workspace.id,
    assetId,
    name.trim(),
    description?.trim(),
    newImageUrl
  );
}

// ─── Delete Asset ───────────────────────────────────────────────────────────

const deleteAssetSchema = z.object({
  assetId: z.string().uuid(),
});

export async function deleteAssetAction(
  input: z.input<typeof deleteAssetSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteAssetSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteAsset(workspace.id, parsed.data.assetId);
}
