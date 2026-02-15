import { createAdminClient } from "@/lib/supabase/admin";
import type { Variation, VariationStrategy } from "@/types/variations";

// ─── Get Variations for a Saved Ad ──────────────────────────────────────────

export async function getVariationsForAd(
  workspaceId: string,
  savedAdId: string
): Promise<Variation[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("variations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("saved_ad_id", savedAdId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapRow);
}

// ─── Get Single Variation ───────────────────────────────────────────────────

export async function getVariation(
  workspaceId: string,
  variationId: string
): Promise<Variation | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("variations")
    .select("*")
    .eq("id", variationId)
    .eq("workspace_id", workspaceId)
    .single();

  return data ? mapRow(data) : null;
}

// ─── Create Variation Record ────────────────────────────────────────────────

export async function createVariation(
  workspaceId: string,
  savedAdId: string,
  assetId: string,
  strategy: VariationStrategy,
  creditsUsed: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("variations")
    .insert({
      workspace_id: workspaceId,
      saved_ad_id: savedAdId,
      asset_id: assetId,
      strategy,
      credits_used: creditsUsed,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

// ─── Update Variation with Generated Content ────────────────────────────────

export async function completeVariation(
  workspaceId: string,
  variationId: string,
  content: {
    generatedHeadline?: string;
    generatedBody?: string;
    generatedImageUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("variations")
    .update({
      generated_headline: content.generatedHeadline ?? null,
      generated_body: content.generatedBody ?? null,
      generated_image_url: content.generatedImageUrl ?? null,
      status: "completed",
    })
    .eq("id", variationId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Mark Variation as Failed ───────────────────────────────────────────────

export async function failVariation(
  workspaceId: string,
  variationId: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("variations")
    .update({ status: "failed" })
    .eq("id", variationId)
    .eq("workspace_id", workspaceId);
}

// ─── Delete Variation ───────────────────────────────────────────────────────

export async function deleteVariation(
  workspaceId: string,
  variationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("variations")
    .delete()
    .eq("id", variationId)
    .eq("workspace_id", workspaceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Map DB row ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Variation {
  return {
    id: row.id,
    savedAdId: row.saved_ad_id,
    assetId: row.asset_id,
    strategy: row.strategy as VariationStrategy,
    generatedImageUrl: row.generated_image_url,
    generatedHeadline: row.generated_headline,
    generatedBody: row.generated_body,
    creditsUsed: row.credits_used,
    status: row.status,
    createdAt: row.created_at,
  };
}
