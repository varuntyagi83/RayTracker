import { db } from "@/lib/db";
import { adComparisons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ComparisonResult, AdComparisonRecord } from "@/types/discover";

export const COMPARISON_CREDIT_COST = 3;

export async function saveComparison(
  workspaceId: string,
  adIds: string[],
  brandNames: string[],
  result: ComparisonResult
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(adComparisons)
      .values({
        workspaceId,
        adIds,
        brandNames,
        result,
        model: "gpt-4o",
        creditsUsed: COMPARISON_CREDIT_COST,
      })
      .returning({ id: adComparisons.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getComparison(
  workspaceId: string,
  comparisonId: string
): Promise<AdComparisonRecord | null> {
  const [row] = await db
    .select()
    .from(adComparisons)
    .where(
      and(
        eq(adComparisons.workspaceId, workspaceId),
        eq(adComparisons.id, comparisonId)
      )
    )
    .limit(1);

  if (!row) return null;
  return mapRow(row);
}

type AdComparisonRow = typeof adComparisons.$inferSelect;

function mapRow(row: AdComparisonRow): AdComparisonRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    adIds: row.adIds as string[],
    brandNames: row.brandNames as string[],
    result: row.result as ComparisonResult,
    model: row.model,
    creditsUsed: row.creditsUsed,
    createdAt: row.createdAt.toISOString(),
  };
}
