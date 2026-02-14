import { describe, it, expect } from "vitest";
import {
  buildLandingPageReport,
  type LandingPageReportData,
  type LandingPageRow,
} from "./landing-page-report";

const sampleRows: LandingPageRow[] = [
  {
    landingPageUrl: "https://example.com/product/amazing-shoes",
    roas: 3.45,
    spend: 1250.75,
    impressions: 125000,
    ctr: 2.35,
  },
  {
    landingPageUrl:
      "https://verylongdomainname.com/path/to/some/very/long/product/page/that/should/be/truncated",
    roas: 2.1,
    spend: 800.0,
    impressions: 80000,
    ctr: 1.85,
  },
];

const baseData: LandingPageReportData = {
  automationName: "LP Analysis",
  rows: sampleRows,
  generatedAt: "Feb 14, 2026",
};

describe("buildLandingPageReport", () => {
  it("includes test run prefix when isTestRun is true", () => {
    const msg = buildLandingPageReport(baseData, "#c", true);
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toContain(":test_tube: TEST RUN");
  });

  it("does not include test run prefix by default", () => {
    const msg = buildLandingPageReport(baseData, "#c");
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toBe("LP Analysis");
  });

  it("limits rows to 20", () => {
    const manyRows: LandingPageRow[] = Array.from({ length: 30 }, (_, i) => ({
      landingPageUrl: `https://example.com/page${i}`,
      roas: 2.0,
      spend: 100,
      impressions: 10000,
      ctr: 1.5,
    }));
    const data: LandingPageReportData = { ...baseData, rows: manyRows };
    const msg = buildLandingPageReport(data, "#c");
    const rowSections = msg.blocks.filter(
      (b) =>
        b.type === "section" &&
        typeof b.text === "object" &&
        b.text !== null &&
        "text" in b.text &&
        (b.text as { text: string }).text.match(/^\*#\d+\./)
    );
    expect(rowSections.length).toBeLessThanOrEqual(20);
  });

  it("shortens long URLs", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    // hostname+path truncated to 50 chars (47 + "...")
    expect(blockTexts).toContain("verylongdomainname.com/path/to/some/very/long/p...");
  });

  it("does not shorten short URLs", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("example.com/product/amazing-shoes");
  });

  it("handles invalid URLs gracefully", () => {
    const data: LandingPageReportData = {
      ...baseData,
      rows: [
        {
          landingPageUrl: "not-a-valid-url",
          roas: 1.5,
          spend: 100,
          impressions: 10000,
          ctr: 1.0,
        },
      ],
    };
    const blockTexts = JSON.stringify(
      buildLandingPageReport(data, "#c").blocks
    );
    expect(blockTexts).toContain("not-a-valid-url");
  });

  it("formats ROAS with x suffix", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("3.45x");
    expect(blockTexts).toContain("2.10x");
  });

  it("formats spend with $ and commas", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("$1,250.75");
    expect(blockTexts).toContain("$800.00");
  });

  it("formats impressions with commas", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("125,000");
    expect(blockTexts).toContain("80,000");
  });

  it("formats CTR with % suffix", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("2.35%");
    expect(blockTexts).toContain("1.85%");
  });

  it("includes footer with Voltic branding", () => {
    const blockTexts = JSON.stringify(
      buildLandingPageReport(baseData, "#c").blocks
    );
    expect(blockTexts).toContain("Powered by Voltic");
  });
});
