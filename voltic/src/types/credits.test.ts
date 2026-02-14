import { describe, it, expect } from "vitest";
import {
  isUnlimitedCredits,
  generateTransactionDescription,
  CREDIT_PACKAGES,
  TRANSACTION_TYPE_LABELS,
  UNLIMITED_CREDITS_THRESHOLD,
  type TransactionType,
} from "./credits";

describe("isUnlimitedCredits", () => {
  it("returns true when balance equals threshold", () => {
    expect(isUnlimitedCredits(UNLIMITED_CREDITS_THRESHOLD)).toBe(true);
  });

  it("returns true when balance exceeds threshold", () => {
    expect(isUnlimitedCredits(1_000_000)).toBe(true);
    expect(isUnlimitedCredits(5_000_000)).toBe(true);
  });

  it("returns false when balance is below threshold", () => {
    expect(isUnlimitedCredits(999_998)).toBe(false);
    expect(isUnlimitedCredits(500)).toBe(false);
    expect(isUnlimitedCredits(0)).toBe(false);
  });
});

describe("generateTransactionDescription", () => {
  it("formats variation deduction", () => {
    expect(generateTransactionDescription("variation", -10)).toBe(
      "AI Variation generation (-10 credits)"
    );
  });

  it("formats creative_enhance deduction", () => {
    expect(generateTransactionDescription("creative_enhance", -5)).toBe(
      "Creative Enhancement (-5 credits)"
    );
  });

  it("formats ad_insight deduction", () => {
    expect(generateTransactionDescription("ad_insight", -3)).toBe(
      "AI Ad Insight generation (-3 credits)"
    );
  });

  it("formats comparison deduction", () => {
    expect(generateTransactionDescription("comparison", -2)).toBe(
      "AI Ad Comparison (-2 credits)"
    );
  });

  it("formats competitor_report deduction", () => {
    expect(generateTransactionDescription("competitor_report", -1)).toBe(
      "Competitor Report generation (-1 credits)"
    );
  });

  it("formats purchase addition", () => {
    expect(generateTransactionDescription("purchase", 100)).toBe(
      "Credit purchase (+100 credits)"
    );
  });

  it("formats refund addition", () => {
    expect(generateTransactionDescription("refund", 50)).toBe(
      "Refund (+50 credits)"
    );
  });

  it("formats welcome_bonus addition", () => {
    expect(generateTransactionDescription("welcome_bonus", 25)).toBe(
      "Welcome bonus (+25 credits)"
    );
  });

  it("uses Math.abs for negative amounts", () => {
    // negative amount should display as positive in deduction description
    const result = generateTransactionDescription("variation", -10);
    expect(result).toContain("10 credits");
    expect(result).not.toContain("--10");
  });

  it("falls back for unknown type", () => {
    const result = generateTransactionDescription(
      "unknown_type" as TransactionType,
      42
    );
    expect(result).toBe("Credit transaction (42 credits)");
  });
});

describe("CREDIT_PACKAGES", () => {
  it("contains exactly 3 packages", () => {
    expect(CREDIT_PACKAGES).toHaveLength(3);
  });

  it("has starter, pro, enterprise with correct values", () => {
    expect(CREDIT_PACKAGES[0]).toEqual({
      id: "starter",
      credits: 100,
      price: 9.99,
      popular: false,
    });
    expect(CREDIT_PACKAGES[1]).toEqual({
      id: "pro",
      credits: 500,
      price: 39.99,
      popular: true,
    });
    expect(CREDIT_PACKAGES[2]).toEqual({
      id: "enterprise",
      credits: 1000,
      price: 69.99,
      popular: false,
    });
  });

  it("marks only pro as popular", () => {
    const popular = CREDIT_PACKAGES.filter((p) => p.popular);
    expect(popular).toHaveLength(1);
    expect(popular[0].id).toBe("pro");
  });
});

describe("TRANSACTION_TYPE_LABELS", () => {
  it("has labels for all 9 transaction types", () => {
    expect(Object.keys(TRANSACTION_TYPE_LABELS)).toHaveLength(9);
  });

  it("has correct labels", () => {
    expect(TRANSACTION_TYPE_LABELS.variation).toBe("Variation");
    expect(TRANSACTION_TYPE_LABELS.purchase).toBe("Purchase");
    expect(TRANSACTION_TYPE_LABELS.welcome_bonus).toBe("Welcome Bonus");
  });
});
