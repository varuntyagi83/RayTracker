// ─── Transaction Types ────────────────────────────────────────────────────

export type TransactionType =
  | "variation"
  | "creative_enhance"
  | "ad_insight"
  | "comparison"
  | "competitor_report"
  | "decomposition"
  | "purchase"
  | "refund"
  | "welcome_bonus";

// ─── Credit Transaction Record ───────────────────────────────────────────

export interface CreditTransaction {
  id: string;
  workspaceId: string;
  amount: number;
  type: TransactionType;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

// ─── Unlimited Credits ──────────────────────────────────────────────────

/** Workspaces with balance >= this value are treated as unlimited (no deduction). */
export const UNLIMITED_CREDITS_THRESHOLD = 999_999;

export function isUnlimitedCredits(balance: number): boolean {
  return balance >= UNLIMITED_CREDITS_THRESHOLD;
}

// ─── Credit Packages ─────────────────────────────────────────────────────

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", credits: 100, price: 9.99, popular: false },
  { id: "pro", credits: 500, price: 39.99, popular: true },
  { id: "enterprise", credits: 1000, price: 69.99, popular: false },
];

// ─── Description Generator ───────────────────────────────────────────────

const DESCRIPTION_MAP: Record<TransactionType, (amount: number) => string> = {
  variation: (n) => `AI Variation generation (-${n} credits)`,
  creative_enhance: (n) => `Creative Enhancement (-${n} credits)`,
  ad_insight: (n) => `AI Ad Insight generation (-${n} credits)`,
  comparison: (n) => `AI Ad Comparison (-${n} credits)`,
  competitor_report: (n) => `Competitor Report generation (-${n} credits)`,
  decomposition: (n) => `Ad Decomposition analysis (-${n} credits)`,
  purchase: (n) => `Credit purchase (+${n} credits)`,
  refund: (n) => `Refund (+${n} credits)`,
  welcome_bonus: (n) => `Welcome bonus (+${n} credits)`,
};

export function generateTransactionDescription(
  type: TransactionType,
  amount: number
): string {
  return DESCRIPTION_MAP[type]?.(Math.abs(amount)) ?? `Credit transaction (${amount} credits)`;
}

// ─── Type Labels (for UI) ────────────────────────────────────────────────

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  variation: "Variation",
  creative_enhance: "Enhancement",
  ad_insight: "Ad Insight",
  comparison: "Comparison",
  competitor_report: "Competitor Report",
  decomposition: "Decomposition",
  purchase: "Purchase",
  refund: "Refund",
  welcome_bonus: "Welcome Bonus",
};
