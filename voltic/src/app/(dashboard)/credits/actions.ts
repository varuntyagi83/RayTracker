"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { getCreditTransactions, getTotalCreditsUsed } from "@/lib/data/credits";
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
