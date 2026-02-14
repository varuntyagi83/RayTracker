import { createAdminClient } from "@/lib/supabase/admin";
import type { CreditTransaction, TransactionType } from "@/types/credits";
import { generateTransactionDescription } from "@/types/credits";

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
  const supabase = createAdminClient();
  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
    .from("credit_transactions")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return { transactions: [], totalCount: 0, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    transactions: data.map(mapRow),
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ─── Add Credits ─────────────────────────────────────────────────────────

export async function addCredits(
  workspaceId: string,
  amount: number,
  type: TransactionType = "purchase",
  description?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient();

  // Fetch current balance
  const { data: workspace, error: fetchErr } = await supabase
    .from("workspaces")
    .select("credit_balance")
    .eq("id", workspaceId)
    .single();

  if (fetchErr || !workspace) {
    return { success: false, newBalance: 0, error: "Workspace not found" };
  }

  const newBalance = workspace.credit_balance + amount;

  // Update balance
  const { error: updateErr } = await supabase
    .from("workspaces")
    .update({ credit_balance: newBalance })
    .eq("id", workspaceId)
    .eq("credit_balance", workspace.credit_balance);

  if (updateErr) {
    return { success: false, newBalance: workspace.credit_balance, error: updateErr.message };
  }

  // Record transaction
  const txDescription = description ?? generateTransactionDescription(type, amount);
  await supabase.from("credit_transactions").insert({
    workspace_id: workspaceId,
    amount,
    type,
    description: txDescription,
  });

  return { success: true, newBalance };
}

// ─── Get Current Balance ─────────────────────────────────────────────────

export async function getCurrentBalance(workspaceId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspaces")
    .select("credit_balance")
    .eq("id", workspaceId)
    .single();

  return data?.credit_balance ?? 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CreditTransaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    amount: row.amount,
    type: row.type,
    referenceId: row.reference_id,
    description: row.description,
    createdAt: row.created_at,
  };
}
