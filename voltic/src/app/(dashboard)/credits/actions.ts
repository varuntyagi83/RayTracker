"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { getCreditTransactions, addCredits, getTotalCreditsUsed } from "@/lib/data/credits";
import { CREDIT_PACKAGES } from "@/types/credits";
import type { TransactionType } from "@/types/credits";

const fetchTransactionsSchema = z.object({
  type: z.string().max(50).optional(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
});

// ─── Fetch Transactions ──────────────────────────────────────────────────

export async function fetchCreditTransactionsAction(input: {
  type?: string;
  page: number;
  pageSize: number;
}) {
  const parsed = fetchTransactionsSchema.safeParse(input);
  if (!parsed.success) return { transactions: [], totalCount: 0, totalPages: 0 };

  const workspace = await getWorkspace();
  if (!workspace) return { transactions: [], totalCount: 0, totalPages: 0 };

  const typeFilter =
    parsed.data.type && parsed.data.type !== "all"
      ? (parsed.data.type as TransactionType)
      : undefined;

  return await getCreditTransactions(
    workspace.id,
    { type: typeFilter },
    { page: parsed.data.page, pageSize: parsed.data.pageSize }
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
