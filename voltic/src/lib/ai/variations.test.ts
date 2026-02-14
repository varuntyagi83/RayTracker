import { describe, it, expect } from "vitest";
import {
  buildBrandGuidelinesSection,
  buildTextPrompt,
  buildImagePrompt,
} from "./variations";
import type { BrandGuidelines } from "@/types/variations";

const mockAd = {
  brandName: "Nike" as string | null,
  headline: "Just Do It" as string | null,
  body: "The best running shoes for athletes" as string | null,
  format: "image",
};

const mockAsset = {
  name: "SuperRun Pro",
  description: "High-performance running shoes with advanced cushioning" as string | null,
};

const fullGuidelines: BrandGuidelines = {
  brandName: "MyBrand",
  brandVoice: "Friendly and approachable",
  colorPalette: "#FF5733, #3498DB",
  targetAudience: "Active millennials",
  dosAndDonts: "Always use lowercase. Never use exclamation marks.",
};

// ─── buildBrandGuidelinesSection ──────────────────────────────────────────────

describe("buildBrandGuidelinesSection", () => {
  it("returns empty string when undefined", () => {
    expect(buildBrandGuidelinesSection()).toBe("");
  });

  it("returns empty string when no fields populated", () => {
    expect(buildBrandGuidelinesSection({})).toBe("");
  });

  it("includes only populated fields", () => {
    const result = buildBrandGuidelinesSection({ brandName: "TestBrand" });
    expect(result).toContain("Brand Name: TestBrand");
    expect(result).not.toContain("Brand Voice:");
    expect(result).not.toContain("Color Palette:");
  });

  it("includes all fields when fully populated", () => {
    const result = buildBrandGuidelinesSection(fullGuidelines);
    expect(result).toContain("BRAND GUIDELINES (must follow)");
    expect(result).toContain("Brand Name: MyBrand");
    expect(result).toContain("Brand Voice: Friendly and approachable");
    expect(result).toContain("Color Palette: #FF5733, #3498DB");
    expect(result).toContain("Target Audience: Active millennials");
    expect(result).toContain("Guidelines: Always use lowercase");
  });
});

// ─── buildTextPrompt ─────────────────────────────────────────────────────────

describe("buildTextPrompt", () => {
  it("includes hero_product strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("HERO PRODUCT");
    expect(prompt).toContain("positions the product as the hero");
  });

  it("includes curiosity strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "curiosity");
    expect(prompt).toContain("CURIOSITY");
    expect(prompt).toContain("open loop");
  });

  it("includes pain_point strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "pain_point");
    expect(prompt).toContain("PAIN POINT");
    expect(prompt).toContain("pain point");
  });

  it("includes proof_point strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "proof_point");
    expect(prompt).toContain("PROOF POINT");
    expect(prompt).toContain("social proof");
  });

  it("includes image_only strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "image_only");
    expect(prompt).toContain("IMAGE ONLY");
    expect(prompt).toContain("image-first");
  });

  it("includes text_only strategy instruction", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "text_only");
    expect(prompt).toContain("TEXT ONLY");
    expect(prompt).toContain("longer, more detailed");
  });

  it("includes competitor ad details", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("Brand: Nike");
    expect(prompt).toContain("Headline: Just Do It");
    expect(prompt).toContain("Body: The best running shoes");
  });

  it("includes product details", () => {
    const prompt = buildTextPrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("Product: SuperRun Pro");
    expect(prompt).toContain("Description: High-performance running shoes");
  });

  it("includes brand guidelines when provided", () => {
    const prompt = buildTextPrompt(
      mockAd,
      mockAsset,
      "hero_product",
      fullGuidelines
    );
    expect(prompt).toContain("BRAND GUIDELINES (must follow)");
    expect(prompt).toContain("MyBrand");
  });

  it("handles null ad fields gracefully", () => {
    const nullAd = {
      brandName: null,
      headline: null,
      body: null,
      format: "video",
    };
    const prompt = buildTextPrompt(nullAd, mockAsset, "hero_product");
    expect(prompt).toContain("Brand: Unknown");
    expect(prompt).toContain("Headline: (none)");
    expect(prompt).toContain("Body: (none)");
  });

  it("handles null asset description", () => {
    const noDescAsset = { name: "Test Product", description: null };
    const prompt = buildTextPrompt(mockAd, noDescAsset, "hero_product");
    expect(prompt).toContain("Description: (no description)");
  });
});

// ─── buildImagePrompt ────────────────────────────────────────────────────────

describe("buildImagePrompt", () => {
  it("includes product name", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("SuperRun Pro");
  });

  it("references competitor brand", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("Nike");
  });

  it("includes hero_product style notes", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("prominently featured in the center");
  });

  it("includes curiosity style notes", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "curiosity");
    expect(prompt).toContain("visually intriguing");
  });

  it("includes pain_point style notes", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "pain_point");
    expect(prompt).toContain("before/after");
  });

  it("includes proof_point style notes", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "proof_point");
    expect(prompt).toContain("premium, trustworthy");
  });

  it("includes image_only style notes", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "image_only");
    expect(prompt).toContain("standalone ad image");
  });

  it("includes brand color palette when provided", () => {
    const prompt = buildImagePrompt(
      mockAd,
      mockAsset,
      "hero_product",
      fullGuidelines
    );
    expect(prompt).toContain("#FF5733, #3498DB");
  });

  it("excludes color palette when no guidelines", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).not.toContain("brand color palette");
  });

  it("includes no-text instruction", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("Do NOT include any text, logos, or watermarks");
  });

  it("handles null brand name", () => {
    const nullBrandAd = { brandName: null, format: "image" };
    const prompt = buildImagePrompt(nullBrandAd, mockAsset, "hero_product");
    expect(prompt).toContain("a competitor");
  });
});
