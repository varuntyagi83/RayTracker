import { db } from "@/lib/db";
import { adInsights, workspaces, creditTransactions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { AdInsightData, AdInsightRecord } from "@/types/discover";
import type { TransactionType } from "@/types/credits";
import { generateTransactionDescription, isUnlimitedCredits } from "@/types/credits";

const INSIGHT_CREDIT_COST = 2;

// ─── Get Existing Insight ─────────────────────────────────────────────────

export async function getExistingInsight(
  workspaceId: string,
  metaLibraryId: string
): Promise<AdInsightRecord | null> {
  const [row] = await db
    .select()
    .from(adInsights)
    .where(
      and(
        eq(adInsights.workspaceId, workspaceId),
        eq(adInsights.metaLibraryId, metaLibraryId)
      )
    )
    .limit(1);

  if (!row) return null;

  return mapRow(row);
}

// ─── Batch Lookup by Meta Library IDs ────────────────────────────────────

export async function getInsightsByMetaLibraryIds(
  workspaceId: string,
  metaLibraryIds: string[]
): Promise<Record<string, AdInsightRecord>> {
  if (metaLibraryIds.length === 0) return {};

  const rows = await db
    .select()
    .from(adInsights)
    .where(
      and(
        eq(adInsights.workspaceId, workspaceId),
        inArray(adInsights.metaLibraryId, metaLibraryIds)
      )
    );

  const result: Record<string, AdInsightRecord> = {};
  for (const row of rows) {
    result[row.metaLibraryId] = mapRow(row);
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
  try {
    await db
      .insert(adInsights)
      .values({
        workspaceId,
        metaLibraryId,
        brandName,
        headline,
        bodyText,
        format,
        insights,
        model: "gpt-4o",
        creditsUsed: INSIGHT_CREDIT_COST,
      })
      .onConflictDoUpdate({
        target: [adInsights.workspaceId, adInsights.metaLibraryId],
        set: {
          brandName,
          headline,
          bodyText,
          format,
          insights,
          model: "gpt-4o",
          creditsUsed: INSIGHT_CREDIT_COST,
        },
      });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Credit Operations ─────────────────────────────────────────────────────

export async function checkAndDeductCredits(
  workspaceId: string,
  amount: number,
  type: TransactionType = "ad_insight",
  description?: string
): Promise<{ success: boolean; remainingBalance: number; error?: string }> {
  // 1. Check current balance
  const [workspace] = await db
    .select({ creditBalance: workspaces.creditBalance })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return { success: false, remainingBalance: 0, error: "Workspace not found" };
  }

  // Unlimited credits — skip deduction entirely
  if (isUnlimitedCredits(workspace.creditBalance)) {
    return { success: true, remainingBalance: workspace.creditBalance };
  }

  if (workspace.creditBalance < amount) {
    return {
      success: false,
      remainingBalance: workspace.creditBalance,
      error: `Insufficient credits. Need ${amount}, have ${workspace.creditBalance}.`,
    };
  }

  // 2. Deduct credits with optimistic concurrency.
  // Drizzle returns the updated rows; 0 rows means the balance changed concurrently.
  const newBalance = workspace.creditBalance - amount;
  const updated = await db
    .update(workspaces)
    .set({ creditBalance: newBalance })
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.creditBalance, workspace.creditBalance)
      )
    )
    .returning({ creditBalance: workspaces.creditBalance });

  if (!updated.length) {
    return {
      success: false,
      remainingBalance: workspace.creditBalance,
      error: "Credit balance changed concurrently — please retry.",
    };
  }

  // 3. Record transaction with correct type
  const txDescription = description ?? generateTransactionDescription(type, amount);
  try {
    await db.insert(creditTransactions).values({
      workspaceId,
      amount: -amount,
      type,
      description: txDescription,
    });
  } catch (txErr) {
    // Ledger insert failed — refund balance to keep credits and audit trail in sync
    const refund = await refundCredits(workspaceId, amount);
    if (!refund.success) {
      console.error("[checkAndDeductCredits] Ledger insert failed AND refund failed — manual intervention required:", {
        workspace_id: workspaceId,
        amount,
        type,
        ledgerError: txErr instanceof Error ? txErr.message : String(txErr),
        refundError: refund.error,
      });
    }
    return {
      success: false,
      remainingBalance: workspace.creditBalance,
      error: "Transaction recording failed, credits restored.",
    };
  }

  return { success: true, remainingBalance: newBalance };
}

export async function refundCredits(
  workspaceId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  // Retry up to 3 times to handle concurrent balance modifications.
  // Drizzle returns 0 rows when the optimistic-lock WHERE doesn't match,
  // so we re-read current balance and retry on collision.
  let refunded = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [workspace] = await db
      .select({ creditBalance: workspaces.creditBalance })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) break;

    // Skip for unlimited-credit accounts
    if (isUnlimitedCredits(workspace.creditBalance)) {
      refunded = true;
      break;
    }

    const updated = await db
      .update(workspaces)
      .set({ creditBalance: workspace.creditBalance + amount })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.creditBalance, workspace.creditBalance)
        )
      )
      .returning({ creditBalance: workspaces.creditBalance });

    if (updated.length) {
      refunded = true;
      break;
    }
    // 0 rows updated = another request changed credit_balance between our read
    // and write — loop and re-read the current balance before retrying
  }

  if (!refunded) {
    const msg = `Failed to refund ${amount} credits to workspace ${workspaceId} after 3 attempts`;
    console.error(`[refundCredits] ${msg}`);
    return { success: false, error: msg };
  }

  // Record refund transaction
  try {
    await db.insert(creditTransactions).values({
      workspaceId,
      amount,
      type: "refund",
      description: `Credit refund: ${amount} credits returned`,
    });
  } catch (txErr) {
    console.error("[refundCredits] Ledger insert failed — refund applied to balance but no transaction record:", {
      workspace_id: workspaceId,
      amount,
      error: txErr instanceof Error ? txErr.message : String(txErr),
    });
  }

  return { success: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdInsightRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    metaLibraryId: row.metaLibraryId,
    brandName: row.brandName,
    headline: row.headline,
    bodyText: row.bodyText,
    format: row.format,
    insights: row.insights as AdInsightData,
    model: row.model,
    creditsUsed: row.creditsUsed,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export { INSIGHT_CREDIT_COST };
