import { describe, it, expect } from "vitest";
import { buildCompetitorReport } from "./competitor-report";
import type {
  AdsLibraryScrapeResult,
  AdsLibraryAd,
} from "@/lib/meta/ads-library";

const makeAd = (overrides: Partial<AdsLibraryAd> = {}): AdsLibraryAd => ({
  id: "ad_1",
  pageId: "page_1",
  pageName: "Nike",
  headline: "Summer Sale",
  bodyText: "Get 50% off on all running shoes this week only!",
  linkUrl: "https://nike.com/sale",
  mediaType: "image",
  mediaThumbnailUrl: "https://example.com/thumb.jpg",
  startDate: "2026-02-01",
  endDate: null,
  isActive: true,
  impressionRange: { lower: 10000, upper: 50000 },
  platforms: ["facebook", "instagram"],
  adsLibraryUrl: "https://facebook.com/ads/library/?id=ad_1",
  ...overrides,
});

const baseScrapeResult: AdsLibraryScrapeResult = {
  ads: [makeAd()],
  totalCount: 1,
  scrapedAt: "2026-02-14T10:00:00Z",
  brandName: "Nike",
};

describe("buildCompetitorReport", () => {
  it("includes test run prefix when isTestRun is true", () => {
    const msg = buildCompetitorReport(baseScrapeResult, "Tracker", "#ch", true);
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toContain(":test_tube: TEST RUN");
  });

  it("does not include test run prefix by default", () => {
    const msg = buildCompetitorReport(baseScrapeResult, "Tracker", "#ch");
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toBe("Tracker");
  });

  it("limits ads to 15", () => {
    const manyAds = Array.from({ length: 25 }, (_, i) =>
      makeAd({ id: `ad_${i}`, headline: `Ad ${i}` })
    );
    const data: AdsLibraryScrapeResult = {
      ...baseScrapeResult,
      ads: manyAds,
      totalCount: 25,
    };
    const msg = buildCompetitorReport(data, "T", "#c");
    const adSections = msg.blocks.filter(
      (b) =>
        b.type === "section" &&
        typeof b.text === "object" &&
        b.text !== null &&
        "text" in b.text &&
        (b.text as { text: string }).text.match(/^\*#\d+\./)
    );
    expect(adSections.length).toBeLessThanOrEqual(15);
  });

  it("truncates body text longer than 150 chars", () => {
    const data: AdsLibraryScrapeResult = {
      ...baseScrapeResult,
      ads: [makeAd({ bodyText: "A".repeat(200) })],
    };
    const blockTexts = JSON.stringify(
      buildCompetitorReport(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain("A".repeat(147) + "...");
    expect(blockTexts).not.toContain("A".repeat(148));
  });

  it("does not truncate short body text", () => {
    const msg = buildCompetitorReport(baseScrapeResult, "T", "#c");
    const blockTexts = JSON.stringify(msg.blocks);
    expect(blockTexts).toContain("Get 50% off on all running shoes");
  });

  it("formats impression range with commas", () => {
    const blockTexts = JSON.stringify(
      buildCompetitorReport(baseScrapeResult, "T", "#c").blocks
    );
    expect(blockTexts).toContain("10,000");
    expect(blockTexts).toContain("50,000");
  });

  it("omits impression range when null", () => {
    const data: AdsLibraryScrapeResult = {
      ...baseScrapeResult,
      ads: [makeAd({ impressionRange: null })],
    };
    const blockTexts = JSON.stringify(
      buildCompetitorReport(data, "T", "#c").blocks
    );
    expect(blockTexts).not.toContain("Impressions:");
  });

  it("includes View in Ads Library button", () => {
    const msg = buildCompetitorReport(baseScrapeResult, "T", "#c");
    const btn = msg.blocks.find(
      (b) => b.type === "actions" && b.elements?.[0]?.url
    );
    expect(btn).toBeDefined();
    expect(btn?.elements?.[0]?.url).toBe(
      "https://facebook.com/ads/library/?id=ad_1"
    );
  });
});
