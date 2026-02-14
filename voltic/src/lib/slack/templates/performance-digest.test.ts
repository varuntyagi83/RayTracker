import { describe, it, expect } from "vitest";
import {
  buildPerformanceDigest,
  type PerformanceDigestData,
  type PerformanceRow,
} from "./performance-digest";
import type { PerformanceConfig } from "@/types/automation";

const baseConfig: PerformanceConfig = {
  aggregation: "campaigns",
  metrics: ["spend", "roas", "revenue"],
  timePeriods: ["yesterday"],
  sortBy: { metric: "roas", direction: "desc", period: "yesterday" },
  classification: {
    enabled: false,
    criticalThreshold: 0.8,
    topThreshold: 2.0,
  },
  filters: { entity: [], metric: [] },
};

const sampleRows: PerformanceRow[] = [
  {
    name: "Campaign A",
    classification: "top",
    metrics: { spend: 1500.5, roas: 3.25, revenue: 4876.62 },
  },
  {
    name: "Campaign B",
    classification: "normal",
    metrics: { spend: 800.0, roas: 1.45, revenue: 1160.0 },
  },
  {
    name: "Campaign C",
    classification: "critical",
    metrics: { spend: 2200.0, roas: 0.65, revenue: 1430.0 },
  },
];

const baseData: PerformanceDigestData = {
  automationName: "Daily Performance",
  aggregation: "campaigns",
  rows: sampleRows,
  config: baseConfig,
  generatedAt: "Feb 14, 2026",
};

describe("buildPerformanceDigest", () => {
  it("includes test run prefix when isTestRun is true", () => {
    const msg = buildPerformanceDigest(baseData, "#alerts", true);
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toContain(":test_tube: TEST RUN");
    expect(msg.text).toContain(":test_tube: TEST RUN");
  });

  it("does not include test run prefix by default", () => {
    const msg = buildPerformanceDigest(baseData, "#alerts");
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toBe("Daily Performance");
  });

  it("sets correct channel", () => {
    const msg = buildPerformanceDigest(baseData, "#my-channel");
    expect(msg.channel).toBe("#my-channel");
  });

  it("groups rows by classification when enabled", () => {
    const data: PerformanceDigestData = {
      ...baseData,
      config: {
        ...baseConfig,
        classification: { enabled: true, criticalThreshold: 0.8, topThreshold: 2.0 },
      },
    };
    const msg = buildPerformanceDigest(data, "#c");
    const blockTexts = JSON.stringify(msg.blocks);
    expect(blockTexts).toContain("Top Performers");
    expect(blockTexts).toContain("Normal Performers");
    expect(blockTexts).toContain("Critical Performers");
  });

  it("does not group when classification disabled", () => {
    const msg = buildPerformanceDigest(baseData, "#c");
    const blockTexts = JSON.stringify(msg.blocks);
    expect(blockTexts).not.toContain("Performers");
  });

  it("formats spend with $ and 2 decimals", () => {
    const blockTexts = JSON.stringify(
      buildPerformanceDigest(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("$1,500.50");
    expect(blockTexts).toContain("$800.00");
  });

  it("formats roas with x suffix", () => {
    const blockTexts = JSON.stringify(
      buildPerformanceDigest(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("3.25x");
    expect(blockTexts).toContain("1.45x");
  });

  it("formats ctr with % suffix", () => {
    const data: PerformanceDigestData = {
      ...baseData,
      rows: [{ name: "X", metrics: { ctr: 2.35 } }],
      config: { ...baseConfig, metrics: ["ctr"] },
    };
    const blockTexts = JSON.stringify(
      buildPerformanceDigest(data, "#c").blocks
    );
    expect(blockTexts).toContain("2.35%");
  });

  it("formats impressions with comma separators", () => {
    const data: PerformanceDigestData = {
      ...baseData,
      rows: [{ name: "X", metrics: { impressions: 1234567 } }],
      config: { ...baseConfig, metrics: ["impressions"] },
    };
    const blockTexts = JSON.stringify(
      buildPerformanceDigest(data, "#c").blocks
    );
    expect(blockTexts).toContain("1,234,567");
  });

  it("limits header fields to 10 (Slack max)", () => {
    const data: PerformanceDigestData = {
      ...baseData,
      config: {
        ...baseConfig,
        metrics: [
          "spend", "roas", "revenue", "purchases",
          "lp_views", "impressions", "ctr", "spend", "roas",
        ] as PerformanceConfig["metrics"],
      },
    };
    const msg = buildPerformanceDigest(data, "#c");
    const fieldsBlocks = msg.blocks.filter(
      (b) => b.type === "section" && b.fields
    );
    for (const fb of fieldsBlocks) {
      expect(fb.fields!.length).toBeLessThanOrEqual(10);
    }
  });

  it("caps rows to 20 when classification disabled", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      name: `C${i}`,
      metrics: { spend: 100 },
    }));
    const data: PerformanceDigestData = { ...baseData, rows };
    const msg = buildPerformanceDigest(data, "#c");
    const rowBlocks = msg.blocks.filter(
      (b) =>
        b.type === "section" &&
        typeof b.text === "object" &&
        b.text !== null &&
        "text" in b.text &&
        (b.text as { text: string }).text.startsWith("*C")
    );
    expect(rowBlocks.length).toBeLessThanOrEqual(20);
  });

  it("caps rows to 10 per classification group", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      name: `C${i}`,
      classification: "top" as const,
      metrics: { spend: 100 },
    }));
    const data: PerformanceDigestData = {
      ...baseData,
      rows,
      config: {
        ...baseConfig,
        classification: { enabled: true, criticalThreshold: 0.8, topThreshold: 2.0 },
      },
    };
    const msg = buildPerformanceDigest(data, "#c");
    const rowBlocks = msg.blocks.filter(
      (b) =>
        b.type === "section" &&
        typeof b.text === "object" &&
        b.text !== null &&
        "text" in b.text &&
        (b.text as { text: string }).text.startsWith("*C")
    );
    expect(rowBlocks.length).toBeLessThanOrEqual(10);
  });

  it("shows em dash for missing metrics", () => {
    const data: PerformanceDigestData = {
      ...baseData,
      rows: [{ name: "Incomplete", metrics: { spend: 100 } }],
    };
    const blockTexts = JSON.stringify(
      buildPerformanceDigest(data, "#c").blocks
    );
    expect(blockTexts).toContain("—");
  });

  it("handles empty rows", () => {
    const data: PerformanceDigestData = { ...baseData, rows: [] };
    const msg = buildPerformanceDigest(data, "#c");
    expect(msg.text).toContain("0 campaigns");
    expect(msg.blocks.length).toBeGreaterThan(0);
  });

  it("includes footer with Voltic branding", () => {
    const msg = buildPerformanceDigest(baseData, "#c");
    const blockTexts = JSON.stringify(msg.blocks);
    expect(blockTexts).toContain("Powered by Voltic");
  });
});
