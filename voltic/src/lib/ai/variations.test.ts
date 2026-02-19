import { describe, it, expect } from "vitest";
import {
  buildBrandGuidelinesSection,
  buildTextPrompt,
  buildImagePrompt,
  buildAssetTextPrompt,
  buildAssetImagePrompt,
  buildCreativeOptionsSection,
} from "./variations";
import type { BrandGuidelines, CreativeOptions } from "@/types/variations";

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

const fullCreativeOptions: CreativeOptions = {
  angle: "three_quarter",
  lighting: "golden_hour",
  background: "outdoor",
  customInstruction: "Show near a mountain trail",
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

// ─── buildCreativeOptionsSection ─────────────────────────────────────────────

describe("buildCreativeOptionsSection", () => {
  it("returns empty string when undefined", () => {
    expect(buildCreativeOptionsSection()).toBe("");
  });

  it("returns empty string when no options populated", () => {
    expect(buildCreativeOptionsSection({})).toBe("");
  });

  it("includes only populated options", () => {
    const result = buildCreativeOptionsSection({ angle: "front" });
    expect(result).toContain("Product angle: Front View");
    expect(result).not.toContain("Lighting:");
    expect(result).not.toContain("Background:");
  });

  it("includes all options when fully populated", () => {
    const result = buildCreativeOptionsSection(fullCreativeOptions);
    expect(result).toContain("CREATIVE DIRECTION");
    expect(result).toContain("Product angle: 3/4 View");
    expect(result).toContain("Lighting: Golden Hour");
    expect(result).toContain("Background: Outdoor");
    expect(result).toContain("Custom direction: Show near a mountain trail");
  });

  it("includes custom instruction alone", () => {
    const result = buildCreativeOptionsSection({
      customInstruction: "Make it vibrant",
    });
    expect(result).toContain("CREATIVE DIRECTION");
    expect(result).toContain("Custom direction: Make it vibrant");
  });
});

// ─── buildTextPrompt (competitor-based) ─────────────────────────────────────

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
    expect(prompt).toContain("COMPETITOR AD (inspiration)");
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

  it("includes channel instruction when provided", () => {
    const prompt = buildTextPrompt(
      mockAd,
      mockAsset,
      "hero_product",
      undefined,
      "instagram"
    );
    expect(prompt).toContain("INSTAGRAM");
    expect(prompt).toContain("visual-first");
  });
});

// ─── buildAssetTextPrompt (asset-based) ─────────────────────────────────────

describe("buildAssetTextPrompt", () => {
  it("includes product details without competitor section", () => {
    const prompt = buildAssetTextPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("Product: SuperRun Pro");
    expect(prompt).toContain("Description: High-performance running shoes");
    expect(prompt).not.toContain("COMPETITOR AD");
    expect(prompt).not.toContain("Brand: Nike");
  });

  it("includes strategy instruction", () => {
    const prompt = buildAssetTextPrompt(mockAsset, "curiosity");
    expect(prompt).toContain("CURIOSITY");
    expect(prompt).toContain("open loop");
  });

  it("includes creative options when provided", () => {
    const prompt = buildAssetTextPrompt(
      mockAsset,
      "hero_product",
      fullCreativeOptions
    );
    expect(prompt).toContain("CREATIVE DIRECTION");
    expect(prompt).toContain("3/4 View");
    expect(prompt).toContain("Golden Hour");
    expect(prompt).toContain("Outdoor");
    expect(prompt).toContain("Show near a mountain trail");
  });

  it("handles empty creative options", () => {
    const prompt = buildAssetTextPrompt(mockAsset, "hero_product", {});
    expect(prompt).not.toContain("CREATIVE DIRECTION");
  });

  it("includes brand guidelines when provided", () => {
    const prompt = buildAssetTextPrompt(
      mockAsset,
      "hero_product",
      undefined,
      fullGuidelines
    );
    expect(prompt).toContain("BRAND GUIDELINES (must follow)");
    expect(prompt).toContain("MyBrand");
  });

  it("includes channel instruction", () => {
    const prompt = buildAssetTextPrompt(
      mockAsset,
      "hero_product",
      undefined,
      undefined,
      "instagram"
    );
    expect(prompt).toContain("INSTAGRAM");
    expect(prompt).toContain("visual-first");
  });

  it("handles null asset description", () => {
    const noDescAsset = { name: "Test Product", description: null };
    const prompt = buildAssetTextPrompt(noDescAsset, "hero_product");
    expect(prompt).toContain("Description: (no description)");
  });

  it("includes all strategies correctly", () => {
    const strategies = [
      "hero_product",
      "curiosity",
      "pain_point",
      "proof_point",
      "image_only",
      "text_only",
    ] as const;

    for (const strategy of strategies) {
      const prompt = buildAssetTextPrompt(mockAsset, strategy);
      expect(prompt).toContain(strategy.replace(/_/g, " ").toUpperCase());
    }
  });
});

// ─── buildImagePrompt (competitor-based) ────────────────────────────────────

describe("buildImagePrompt", () => {
  it("includes product name", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("SuperRun Pro");
  });

  it("references competitor brand", () => {
    const prompt = buildImagePrompt(mockAd, mockAsset, "hero_product");
    expect(prompt).toContain("Nike");
    expect(prompt).toContain("Inspired by");
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
    expect(prompt).toContain("ZERO text");
    expect(prompt).toContain("no text, letters, words");
  });

  it("handles null brand name", () => {
    const nullBrandAd = { brandName: null, format: "image" };
    const prompt = buildImagePrompt(nullBrandAd, mockAsset, "hero_product");
    expect(prompt).toContain("a competitor");
  });
});

// ─── buildAssetImagePrompt (asset-based) ────────────────────────────────────

describe("buildAssetImagePrompt", () => {
  it("includes product name without competitor reference", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product");
    expect(prompt).toContain("SuperRun Pro");
    expect(prompt).not.toContain("Inspired by");
    expect(prompt).not.toContain("competitor");
  });

  it("includes product description", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product");
    expect(prompt).toContain("High-performance running shoes");
  });

  it("includes strategy style notes", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product");
    expect(prompt).toContain("prominently featured in the center");
  });

  it("includes angle direction when provided", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product", {
      angle: "top",
    });
    expect(prompt).toContain("top down");
  });

  it("includes lighting direction when provided", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product", {
      lighting: "dramatic",
    });
    expect(prompt).toContain("dramatic");
  });

  it("includes background direction when provided", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product", {
      background: "outdoor",
    });
    expect(prompt).toContain("outdoor");
  });

  it("includes custom instruction when provided", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product", {
      customInstruction: "Place on a wooden table",
    });
    expect(prompt).toContain("Place on a wooden table");
  });

  it("includes all creative options together", () => {
    const prompt = buildAssetImagePrompt(
      mockAsset,
      "hero_product",
      fullCreativeOptions
    );
    expect(prompt).toContain("3/4 view");
    expect(prompt).toContain("golden hour");
    expect(prompt).toContain("outdoor");
    expect(prompt).toContain("Show near a mountain trail");
  });

  it("includes brand color palette when provided", () => {
    const prompt = buildAssetImagePrompt(
      mockAsset,
      "hero_product",
      undefined,
      fullGuidelines
    );
    expect(prompt).toContain("#FF5733, #3498DB");
  });

  it("includes no-text instruction", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product");
    expect(prompt).toContain("ZERO text");
    expect(prompt).toContain("no text, letters, words");
  });

  it("handles null asset description", () => {
    const noDescAsset = { name: "Test Product", description: null };
    const prompt = buildAssetImagePrompt(noDescAsset, "hero_product");
    expect(prompt).toContain("Test Product");
    expect(prompt).not.toContain("Product context:");
  });

  it("excludes empty creative options lines", () => {
    const prompt = buildAssetImagePrompt(mockAsset, "hero_product", {});
    expect(prompt).not.toContain("Shoot from");
    expect(prompt).not.toContain("background should be");
    expect(prompt).not.toContain("Additional direction:");
  });
});
