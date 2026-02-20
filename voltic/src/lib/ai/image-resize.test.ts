import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { getDalleSize, ASPECT_RATIO_DIMENSIONS, resizeToAspectRatio } from "./image-resize";
import type { AspectRatio } from "@/types/variations";

describe("getDalleSize", () => {
  it("returns 1024x1024 when no aspect ratio", () => {
    expect(getDalleSize()).toBe("1024x1024");
    expect(getDalleSize(undefined)).toBe("1024x1024");
  });

  it("maps 1:1 to 1024x1024", () => {
    expect(getDalleSize("1:1")).toBe("1024x1024");
  });

  it("maps 9:16 to 1024x1792 (portrait)", () => {
    expect(getDalleSize("9:16")).toBe("1024x1792");
  });

  it("maps 16:9 to 1792x1024 (landscape)", () => {
    expect(getDalleSize("16:9")).toBe("1792x1024");
  });

  it("maps 4:5 to 1024x1792 (portrait)", () => {
    expect(getDalleSize("4:5")).toBe("1024x1792");
  });

  it("maps 3:4 to 1024x1792 (portrait)", () => {
    expect(getDalleSize("3:4")).toBe("1024x1792");
  });

  it("maps 4:3 to 1792x1024 (landscape)", () => {
    expect(getDalleSize("4:3")).toBe("1792x1024");
  });

  it("maps 5:4 to 1024x1024 (near-square)", () => {
    expect(getDalleSize("5:4")).toBe("1024x1024");
  });
});

describe("ASPECT_RATIO_DIMENSIONS", () => {
  it("has entries for all 7 ratios", () => {
    expect(Object.keys(ASPECT_RATIO_DIMENSIONS)).toHaveLength(7);
  });

  it("1:1 is 1024x1024", () => {
    expect(ASPECT_RATIO_DIMENSIONS["1:1"]).toEqual({ width: 1024, height: 1024 });
  });

  it("9:16 is portrait (height > width)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["9:16"];
    expect(dims.height).toBeGreaterThan(dims.width);
    expect(dims.height).toBe(1024);
  });

  it("16:9 is landscape (width > height)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["16:9"];
    expect(dims.width).toBeGreaterThan(dims.height);
    expect(dims.width).toBe(1024);
  });

  it("4:5 is portrait (height > width)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["4:5"];
    expect(dims.height).toBeGreaterThan(dims.width);
  });

  it("4:3 is landscape (width > height)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["4:3"];
    expect(dims.width).toBeGreaterThan(dims.height);
  });

  it("5:4 is landscape (width > height)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["5:4"];
    expect(dims.width).toBeGreaterThan(dims.height);
  });

  it("3:4 is portrait (height > width)", () => {
    const dims = ASPECT_RATIO_DIMENSIONS["3:4"];
    expect(dims.height).toBeGreaterThan(dims.width);
  });
});

// ─── resizeToAspectRatio (real sharp processing) ────────────────────────────

describe("resizeToAspectRatio", () => {
  // Create a 1024x1024 square test image (red PNG)
  async function createTestImage(w = 1024, h = 1024): Promise<Buffer> {
    return sharp({
      create: { width: w, height: h, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
  }

  const ratios: AspectRatio[] = ["1:1", "9:16", "16:9", "4:5", "3:4", "4:3", "5:4"];

  for (const ratio of ratios) {
    it(`resizes a 1024x1024 image to exact ${ratio} dimensions`, async () => {
      const input = await createTestImage();
      const output = await resizeToAspectRatio(input, ratio);

      const meta = await sharp(output).metadata();
      const expected = ASPECT_RATIO_DIMENSIONS[ratio];

      expect(meta.width).toBe(expected.width);
      expect(meta.height).toBe(expected.height);
      expect(meta.format).toBe("png");
    });
  }

  it("resizes a non-square (landscape) source image correctly", async () => {
    const input = await createTestImage(1920, 1080);
    const output = await resizeToAspectRatio(input, "9:16");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(576);
    expect(meta.height).toBe(1024);
  });

  it("resizes a non-square (portrait) source image correctly", async () => {
    const input = await createTestImage(800, 1200);
    const output = await resizeToAspectRatio(input, "16:9");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(576);
  });

  it("output is a valid PNG buffer (not the same as input)", async () => {
    const input = await createTestImage();
    const output = await resizeToAspectRatio(input, "9:16");

    // Output should be a different size buffer than input (portrait crop of square)
    const inputMeta = await sharp(input).metadata();
    const outputMeta = await sharp(output).metadata();

    expect(inputMeta.width).toBe(1024);
    expect(inputMeta.height).toBe(1024);
    expect(outputMeta.width).toBe(576);
    expect(outputMeta.height).toBe(1024);
    // Buffers should be different
    expect(Buffer.compare(input, output)).not.toBe(0);
  });
});
