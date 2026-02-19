"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { listBrandGuidelines } from "@/lib/data/brand-guidelines-entities";
import { getAssets } from "@/lib/data/assets";
import {
  getGeneratedAds,
  createGeneratedAdsBatch,
  deleteGeneratedAd,
} from "@/lib/data/ads";
import type { GeneratedAd, TextPosition } from "@/types/ads";

// ─── Fetch Guidelines for selector ─────────────────────────────────────────

export async function fetchGuidelinesForAdGenAction(): Promise<{
  data?: { id: string; name: string }[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelines = await listBrandGuidelines(workspace.id);
  return {
    data: guidelines.map((g) => ({ id: g.id, name: g.name })),
  };
}

// ─── Fetch Assets linked to guideline ──────────────────────────────────────

export async function fetchAssetsForGuidelineAdGenAction(input: {
  guidelineId: string;
}): Promise<{
  data?: { id: string; name: string; imageUrl: string }[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const assets = await getAssets(workspace.id, undefined, input.guidelineId);
  return {
    data: assets.map((a) => ({ id: a.id, name: a.name, imageUrl: a.imageUrl })),
  };
}

// ─── Fetch Generated Ads ───────────────────────────────────────────────────

export async function fetchGeneratedAdsAction(filters?: {
  brandGuidelineId?: string;
}): Promise<{ data?: GeneratedAd[]; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const ads = await getGeneratedAds(workspace.id, filters);
  return { data: ads };
}

// ─── Save Approved Ads ─────────────────────────────────────────────────────

const saveAdsSchema = z.object({
  ads: z.array(
    z.object({
      brandGuidelineId: z.string().uuid(),
      backgroundAssetId: z.string().uuid(),
      textVariant: z.string().min(1),
      fontFamily: z.string().min(1),
      fontSize: z.number().min(8).max(200),
      textColor: z.string().min(1),
      textPosition: z.object({
        type: z.enum([
          "center",
          "top",
          "bottom",
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
          "custom",
        ]),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
      imageUrl: z.string().url(),
      storagePath: z.string().min(1),
      width: z.number().optional(),
      height: z.number().optional(),
    })
  ),
});

export async function saveApprovedAdsAction(input: {
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
  }>;
}): Promise<{ success: boolean; ids?: string[]; error?: string }> {
  const parsed = saveAdsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await createGeneratedAdsBatch(workspace.id, parsed.data.ads);
}

// ─── Delete Ad ─────────────────────────────────────────────────────────────

export async function deleteAdAction(input: {
  adId: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await deleteGeneratedAd(workspace.id, input.adId);
}
