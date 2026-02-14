"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "brand-assets";

// ─── Types ────────────────────────────────────────────────────────────────

export interface DecompositionHistoryItem {
  id: string;
  sourceImageUrl: string;
  sourceType: string;
  processingStatus: string;
  extractedTextsCount: number;
  productDetected: boolean;
  cleanImageUrl: string | null;
  createdAt: string;
}

// ─── Fetch Decomposition History ──────────────────────────────────────────

export async function fetchDecompositionHistory(): Promise<{
  data?: DecompositionHistoryItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return { error: "No workspace" };

  const { data, error } = await admin
    .from("ad_decompositions")
    .select(
      "id, source_image_url, source_type, processing_status, extracted_texts, product_analysis, clean_image_url, created_at"
    )
    .eq("workspace_id", member.workspace_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };

  const items: DecompositionHistoryItem[] = (data ?? []).map((row) => ({
    id: row.id,
    sourceImageUrl: row.source_image_url,
    sourceType: row.source_type,
    processingStatus: row.processing_status,
    extractedTextsCount: Array.isArray(row.extracted_texts)
      ? row.extracted_texts.length
      : 0,
    productDetected:
      (row.product_analysis as { detected?: boolean } | null)?.detected ?? false,
    cleanImageUrl: row.clean_image_url,
    createdAt: row.created_at,
  }));

  return { data: items };
}

// ─── Upload Image for Decomposition ───────────────────────────────────────

export async function uploadImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return { success: false, error: "No workspace" };

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No image provided" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image must be under 5MB" };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, WebP, and GIF are allowed" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${member.workspace_id}/uploads/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}
