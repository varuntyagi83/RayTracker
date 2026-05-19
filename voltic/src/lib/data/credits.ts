import { db } from "@/lib/db";
import { creditTransactions, workspaces } from "@/db/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { CreditTransaction, TransactionType } from "@/types/credits";
import { generateTransactionDescription, isUnlimitedCredits } from "@/types/credits";

// ─── Get Paginated Transactions ──────────────────────────────────────────

interface TransactionFilters {
  type?: TransactionType;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export async function getCreditTransactions(
  workspaceId: string,
  filters: TransactionFilters,
  pagination: Pagination
): Promise<{
  transactions: CreditTransaction[];
  totalCount: number;
  totalPages: number;
}> {
  const { pageSize } = pagination;
  // Cap page to prevent arbitrarily large Postgres offsets
  const safePage = Math.min(Math.max(1, pagination.page), 1000);
  const offset = (safePage - 1) * pageSize;

  try {
    const conditions = [eq(creditTransactions.workspaceId, workspaceId)];
    if (filters.type) {
      conditions.push(eq(creditTransactions.type, filters.type));
    }

    const whereClause = and(...conditions);

    // Run data + count in parallel
    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(creditTransactions)
        .where(whereClause)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(creditTransactions)
        .where(whereClause),
    ]);

    const totalCount = countResult[0]?.total ?? 0;

    return {
      transactions: rows.map(mapRow),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch {
    return { transactions: [], totalCount: 0, totalPages: 0 };
  }
}

// ─── Add Credits ─────────────────────────────────────────────────────────

export async function addCredits(
  workspaceId: string,
  amount: number,
  type: TransactionType = "purchase",
  description?: string,
  referenceId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // Fetch current balance
  const [workspace] = await db
    .select({ creditBalance: workspaces.creditBalance })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return { success: false, newBalance: 0, error: "Workspace not found" };
  }

  // Skip balance updates for unlimited accounts (avoid noisy transactions)
  if (isUnlimitedCredits(workspace.creditBalance)) {
    return { success: true, newBalance: workspace.creditBalance };
  }

  const newBalance = workspace.creditBalance + amount;

  // Update balance with optimistic concurrency check: only update if the balance
  // hasn't changed since we read it (prevents lost updates under concurrent writes)
  const updated = await db
    .update(workspaces)
    .set({ creditBalance: newBalance })
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.creditBalance, workspace.creditBalance)))
    .returning({ creditBalance: workspaces.creditBalance });

  if (!updated.length) {
    return { success: false, newBalance: workspace.creditBalance, error: "Balance changed concurrently, please retry." };
  }

  // Record transaction — log on failure but don't fail the caller; the balance
  // update already succeeded and rolling it back would require a separate lock.
  const txDescription = description ?? generateTransactionDescription(type, amount);
  try {
    await db.insert(creditTransactions).values({
      workspaceId,
      amount,
      type,
      description: txDescription,
      referenceId: referenceId ?? null,
    });
  } catch (txErr) {
    console.error("[addCredits] Ledger insert failed — balance updated but no transaction record:", {
      workspaceId,
      amount,
      type,
      error: txErr instanceof Error ? txErr.message : String(txErr),
    });
    // Track via PostHog so this surfaces in the dashboard, not just server logs
    try {
      const { trackServer } = await import("@/lib/analytics/posthog-server");
      trackServer("credit_ledger_missing", workspaceId, {
        amount,
        type,
        error: txErr instanceof Error ? txErr.message : String(txErr),
      });
    } catch {
      // Non-fatal: tracking failure must never crash the credit flow
    }
  }

  return { success: true, newBalance };
}

// ─── Get Current Balance ─────────────────────────────────────────────────

export async function getCurrentBalance(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ creditBalance: workspaces.creditBalance })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return row?.creditBalance ?? 0;
}

// ─── Get Total Credits Used ─────────────────────────────────────────────

export async function getTotalCreditsUsed(workspaceId: string): Promise<number> {
  // Sum all negative amounts (usage transactions)
  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(abs(amount)) filter (where amount < 0), 0)::int` })
    .from(creditTransactions)
    .where(and(eq(creditTransactions.workspaceId, workspaceId), lt(creditTransactions.amount, 0)));

  return result?.total ?? 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function mapRow(row: typeof creditTransactions.$inferSelect): CreditTransaction {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    amount: row.amount,
    type: row.type as TransactionType,
    referenceId: row.referenceId,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}
