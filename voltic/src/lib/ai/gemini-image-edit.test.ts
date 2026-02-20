import { describe, it, expect } from "vitest";
import { buildGeminiEditPrompt } from "./gemini-image-edit";

const mockAsset = {
  name: "Vitamin D3 Drops",
  description: "High-potency vitamin D3 supplement in liquid form",
};

describe("buildGeminiEditPrompt", () => {
  it("includes product name and description", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("Vitamin D3 Drops");
    expect(prompt).toContain("High-potency vitamin D3 supplement");
  });

  it("references the product mask", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("product mask");
    expect(prompt).toContain("WHITE areas are the product");
    expect(prompt).toContain("BLACK areas are the background");
  });

  it("tells Gemini to only modify background (mask BLACK areas)", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("ONLY to the BLACK (background) areas");
    expect(prompt).toContain("WHITE areas in the mask are the product");
    expect(prompt).toContain("do NOT modify those pixels");
  });

  it("includes no-text guardrail", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("Do NOT add any NEW text");
    expect(prompt).toContain("Do NOT re-render, regenerate, or alter any text");
  });

  it("includes angle directive when specified", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      angle: "three_quarter",
    });
    expect(prompt).toContain("3/4 view");
  });

  it("includes lighting directive when specified", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      lighting: "golden_hour",
    });
    expect(prompt).toContain("golden hour");
  });

  it("includes background directive when specified", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      background: "outdoor",
    });
    expect(prompt).toContain("outdoor");
  });

  it("includes custom instruction when specified", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      customInstruction: "Place on a wooden shelf",
    });
    expect(prompt).toContain("Place on a wooden shelf");
  });

  it("includes brand color palette when provided", () => {
    const prompt = buildGeminiEditPrompt(
      mockAsset,
      "hero_product",
      undefined,
      { colorPalette: "#2D5F2D, #F5F0E6" }
    );
    expect(prompt).toContain("#2D5F2D, #F5F0E6");
  });

  it("includes strategy visual note for hero_product", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product");
    expect(prompt).toContain("focal point");
  });

  it("includes strategy visual note for curiosity", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "curiosity");
    expect(prompt).toContain("intriguing");
  });

  it("includes strategy visual note for pain_point", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "pain_point");
    expect(prompt).toContain("visual contrast");
  });

  it("includes strategy visual note for proof_point", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "proof_point");
    expect(prompt).toContain("premium");
  });

  it("includes strategy visual note for image_only", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "image_only");
    expect(prompt).toContain("eye-catching");
  });

  it("uses default enhancement when no options and text_only strategy", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "text_only");
    expect(prompt).toContain("Enhance this product image");
  });

  it("includes all creative options together", () => {
    const prompt = buildGeminiEditPrompt(
      mockAsset,
      "hero_product",
      {
        angle: "front",
        lighting: "studio",
        background: "solid_white",
        customInstruction: "Add subtle shadow",
      },
      { colorPalette: "#000, #FFF" }
    );
    expect(prompt).toContain("front view");
    expect(prompt).toContain("studio lighting");
    expect(prompt).toContain("solid white");
    expect(prompt).toContain("Add subtle shadow");
    expect(prompt).toContain("#000, #FFF");
    expect(prompt).toContain("focal point");
  });

  it("handles null asset description", () => {
    const prompt = buildGeminiEditPrompt(
      { name: "Test Product", description: null },
      "hero_product"
    );
    expect(prompt).toContain("Test Product");
    expect(prompt).not.toContain("Product context:");
  });

  it("does not include default enhancement when creative options are provided", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      angle: "side",
    });
    expect(prompt).not.toContain("Enhance this product image");
    expect(prompt).toContain("side view");
  });

  it("does not include default enhancement when only brand palette is provided", () => {
    const prompt = buildGeminiEditPrompt(
      mockAsset,
      "hero_product",
      undefined,
      { colorPalette: "#FF0000" }
    );
    expect(prompt).not.toContain("Enhance this product image");
    expect(prompt).toContain("#FF0000");
  });

  it("includes aspect ratio directive when specified", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      aspectRatio: "16:9",
    });
    expect(prompt).toContain("landscape (16:9)");
  });

  it("includes aspect ratio with other creative options", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      angle: "front",
      aspectRatio: "4:5",
    });
    expect(prompt).toContain("front view");
    expect(prompt).toContain("portrait (4:5)");
  });

  it("does not include default enhancement when only aspect ratio is provided", () => {
    const prompt = buildGeminiEditPrompt(mockAsset, "hero_product", {
      aspectRatio: "9:16",
    });
    expect(prompt).not.toContain("Enhance this product image");
    expect(prompt).toContain("portrait (9:16)");
  });
});
