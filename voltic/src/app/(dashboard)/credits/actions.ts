"use server";

import { getWorkspace } from "@/lib/supabase/queries";
import { getCreditTransactions, addCredits, getTotalCreditsUsed } from "@/lib/data/credits";
import { CREDIT_PACKAGES } from "@/types/credits";
import type { TransactionType } from "@/types/credits";

// ─── Fetch Transactions ──────────────────────────────────────────────────

export async function fetchCreditTransactionsAction(input: {
  type?: string;
  page: number;
  pageSize: number;
}) {
  const workspace = await getWorkspace();
  if (!workspace) return { transactions: [], totalCount: 0, totalPages: 0 };

  const typeFilter =
    input.type && input.type !== "all"
      ? (input.type as TransactionType)
      : undefined;

  return await getCreditTransactions(
    workspace.id,
    { type: typeFilter },
    { page: input.page, pageSize: input.pageSize }
  );
}

// ─── Fetch Total Credits Used ────────────────────────────────────────────

export async function fetchTotalCreditsUsedAction(): Promise<number> {
  const workspace = await getWorkspace();
  if (!workspace) return 0;
  return getTotalCreditsUsed(workspace.id);
}

// ─── Mock Purchase ───────────────────────────────────────────────────────

export async function purchaseCreditsAction(input: {
  packageId: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const pkg = CREDIT_PACKAGES.find((p) => p.id === input.packageId);
  if (!pkg) return { success: false, error: "Invalid package" };

  const result = await addCredits(
    workspace.id,
    pkg.credits,
    "purchase",
    `Credit purchase: ${pkg.credits} credits ($${pkg.price})`
  );

  return result;
}
