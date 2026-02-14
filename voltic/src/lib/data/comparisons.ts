import { createAdminClient } from "@/lib/supabase/admin";
import type { ComparisonResult, AdComparisonRecord } from "@/types/discover";

export const COMPARISON_CREDIT_COST = 3;

export async function saveComparison(
  workspaceId: string,
  adIds: string[],
  brandNames: string[],
  result: ComparisonResult
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ad_comparisons")
    .insert({
      workspace_id: workspaceId,
      ad_ids: adIds,
      brand_names: brandNames,
      result: result,
      model: "gpt-4o",
      credits_used: COMPARISON_CREDIT_COST,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function getComparison(
  workspaceId: string,
  comparisonId: string
): Promise<AdComparisonRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_comparisons")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", comparisonId)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdComparisonRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    adIds: row.ad_ids,
    brandNames: row.brand_names,
    result: row.result as ComparisonResult,
    model: row.model,
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  };
}
