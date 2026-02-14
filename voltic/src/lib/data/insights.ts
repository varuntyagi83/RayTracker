import { createAdminClient } from "@/lib/supabase/admin";
import type { AdInsightData, AdInsightRecord } from "@/types/discover";

const INSIGHT_CREDIT_COST = 2;

// ─── Get Existing Insight ─────────────────────────────────────────────────

export async function getExistingInsight(
  workspaceId: string,
  metaLibraryId: string
): Promise<AdInsightRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_insights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("meta_library_id", metaLibraryId)
    .single();

  if (error || !data) return null;

  return mapRow(data);
}

// ─── Batch Lookup by Meta Library IDs ────────────────────────────────────

export async function getInsightsByMetaLibraryIds(
  workspaceId: string,
  metaLibraryIds: string[]
): Promise<Record<string, AdInsightRecord>> {
  if (metaLibraryIds.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ad_insights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("meta_library_id", metaLibraryIds);

  const result: Record<string, AdInsightRecord> = {};
  for (const row of data ?? []) {
    result[row.meta_library_id] = mapRow(row);
  }
  return result;
}

// ─── Save Insight ──────────────────────────────────────────────────────────

export async function saveInsight(
  workspaceId: string,
  metaLibraryId: string,
  brandName: string,
  headline: string,
  bodyText: string,
  format: string,
  insights: AdInsightData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("ad_insights").upsert(
    {
      workspace_id: workspaceId,
      meta_library_id: metaLibraryId,
      brand_name: brandName,
      headline: headline,
      body_text: bodyText,
      format: format,
      insights: insights,
      model: "gpt-4o",
      credits_used: INSIGHT_CREDIT_COST,
    },
    { onConflict: "workspace_id,meta_library_id" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Credit Operations ─────────────────────────────────────────────────────

export async function checkAndDeductCredits(
  workspaceId: string,
  amount: number
): Promise<{ success: boolean; remainingBalance: number; error?: string }> {
  const supabase = createAdminClient();

  // 1. Check current balance
  const { data: workspace, error: fetchErr } = await supabase
    .from("workspaces")
    .select("credit_balance")
    .eq("id", workspaceId)
    .single();

  if (fetchErr || !workspace) {
    return { success: false, remainingBalance: 0, error: "Workspace not found" };
  }

  if (workspace.credit_balance < amount) {
    return {
      success: false,
      remainingBalance: workspace.credit_balance,
      error: `Insufficient credits. Need ${amount}, have ${workspace.credit_balance}.`,
    };
  }

  // 2. Deduct credits with optimistic concurrency
  const newBalance = workspace.credit_balance - amount;
  const { error: updateErr } = await supabase
    .from("workspaces")
    .update({ credit_balance: newBalance })
    .eq("id", workspaceId)
    .eq("credit_balance", workspace.credit_balance);

  if (updateErr) {
    return {
      success: false,
      remainingBalance: workspace.credit_balance,
      error: updateErr.message,
    };
  }

  // 3. Record transaction
  await supabase.from("credit_transactions").insert({
    workspace_id: workspaceId,
    amount: -amount,
    type: "ad_insight",
    description: `AI Ad Insight generation (-${amount} credits)`,
  });

  return { success: true, remainingBalance: newBalance };
}

export async function refundCredits(
  workspaceId: string,
  amount: number
): Promise<void> {
  const supabase = createAdminClient();

  // Increment balance
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("credit_balance")
    .eq("id", workspaceId)
    .single();

  if (workspace) {
    await supabase
      .from("workspaces")
      .update({ credit_balance: workspace.credit_balance + amount })
      .eq("id", workspaceId);
  }

  // Record refund transaction
  await supabase.from("credit_transactions").insert({
    workspace_id: workspaceId,
    amount: amount,
    type: "refund",
    description: "AI Insight generation failed - credit refund",
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdInsightRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    metaLibraryId: row.meta_library_id,
    brandName: row.brand_name,
    headline: row.headline,
    bodyText: row.body_text,
    format: row.format,
    insights: row.insights as AdInsightData,
    model: row.model,
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  };
}

export { INSIGHT_CREDIT_COST };
