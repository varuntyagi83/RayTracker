"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceMembers, adDecompositions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { uploadBrandAsset } from "@/lib/storage/brand-assets";

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
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!member) return { error: "No workspace" };

  const rows = await db
    .select({
      id: adDecompositions.id,
      sourceImageUrl: adDecompositions.sourceImageUrl,
      sourceType: adDecompositions.sourceType,
      processingStatus: adDecompositions.processingStatus,
      extractedTexts: adDecompositions.extractedTexts,
      productAnalysis: adDecompositions.productAnalysis,
      cleanImageUrl: adDecompositions.cleanImageUrl,
      createdAt: adDecompositions.createdAt,
    })
    .from(adDecompositions)
    .where(eq(adDecompositions.workspaceId, member.workspaceId))
    .orderBy(desc(adDecompositions.createdAt))
    .limit(20);

  const items: DecompositionHistoryItem[] = rows.map((row) => ({
    id: row.id,
    sourceImageUrl: row.sourceImageUrl,
    sourceType: row.sourceType,
    processingStatus: row.processingStatus,
    extractedTextsCount: Array.isArray(row.extractedTexts)
      ? row.extractedTexts.length
      : 0,
    productDetected:
      (row.productAnalysis as { detected?: boolean } | null)?.detected ?? false,
    cleanImageUrl: row.cleanImageUrl,
    createdAt: row.createdAt.toISOString(),
  }));

  return { data: items };
}

// ─── Delete Decomposition ────────────────────────────────────────────────

export async function deleteDecomposition(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!member) return { success: false, error: "No workspace" };

  try {
    await db
      .delete(adDecompositions)
      .where(
        and(
          eq(adDecompositions.id, id),
          eq(adDecompositions.workspaceId, member.workspaceId)
        )
      );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }

  return { success: true };
}

// ─── Upload Image for Decomposition ───────────────────────────────────────

export async function uploadImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

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
  const rawSafeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeName = rawSafeName.replace(/^_+|_+$/g, "") || "upload";
  const path = `${member.workspaceId}/uploads/${Date.now()}-${safeName}`;

  try {
    const publicUrl = await uploadBrandAsset(path, buffer, file.type);
    return { success: true, url: publicUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return { success: false, error: msg };
  }
}
