/**
 * End-to-end test for Phase 21: Ad Decomposition Engine
 *
 * Usage: npx tsx scripts/test-decompose.ts <image_path_or_url>
 *
 * Tests:
 * 1. decomposeAdImage() with a real image
 * 2. Validates response shape matches DecompositionResult
 * 3. Checks that marketing text is separated from product text
 */

import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import type { DecompositionResult, ExtractedText } from "../src/types/decomposition";

// ─── Setup ──────────────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not set. Export it first:");
  console.error("   export OPENAI_API_KEY=sk-...");
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─── System Prompt (mirrors decompose.ts) ────────────────────────────────

// This mirrors the production prompt in lib/ai/decompose.ts exactly
const VISION_SYSTEM_PROMPT = `You are an expert ad creative analyst. Analyze this advertisement image and extract structured data about its composition.

CRITICAL DISTINCTION — You must separate two categories of text:
1. **Marketing/overlay text** — text digitally composited onto the ad (headlines, taglines, descriptions, CTAs, legal disclaimers). This text is NOT physically on the product.
2. **Product/packaging text** — text physically printed on the product packaging itself (brand name, product name, variant name, ingredients, certifications, weight/volume).

If the SAME text appears as both a marketing overlay AND on the product packaging, create TWO separate entries — one as marketing type and one as "brand" type.

Return ONLY valid JSON matching this exact schema:
{
  "texts": [
    {
      "content": "exact text as written",
      "type": "headline" | "subheadline" | "body" | "cta" | "legal" | "brand",
      "position": "top" | "center" | "bottom" | "overlay",
      "estimated_font_size": "large" | "medium" | "small",
      "confidence": 0.0 to 1.0
    }
  ],
  "product": {
    "detected": true/false,
    "description": "description of the product shown",
    "position": "left" | "center" | "right" | "full",
    "occupies_percent": 0 to 100
  },
  "background": {
    "type": "solid_color" | "gradient" | "photo" | "pattern" | "transparent",
    "dominant_colors": ["#hex1", "#hex2"],
    "description": "brief description of the background"
  },
  "layout": {
    "style": "product_hero" | "lifestyle" | "text_heavy" | "minimal" | "split" | "collage",
    "text_overlay_on_image": true/false,
    "brand_elements": ["Logo top-left", "Tagline bottom", etc.]
  }
}

Type classification rules:
- "headline" / "subheadline" / "body" / "cta" / "legal" → ONLY for marketing overlay text (digitally added to the ad)
- "brand" → ONLY for text physically printed on the product packaging

Other rules:
- Capture EVERY piece of visible text exactly as written — even tiny text on product labels
- For product detection, describe what you see without assuming brand names unless clearly visible
- Be precise about text positions relative to the image
- Confidence should reflect how certain you are about the text extraction (OCR quality)
- Lower confidence for small or partially obscured packaging text
- dominant_colors should be valid hex color codes
- brand_elements should list all branding elements with their approximate position`;

// ─── Test Runner ─────────────────────────────────────────────────────────

async function runTest(imageInput: string): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Phase 21: Ad Decomposition Engine — E2E Test          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Resolve image to base64 data URL if it's a local file
  let imageUrl: string;
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    imageUrl = imageInput;
    console.log(`📷 Using URL: ${imageUrl}\n`);
  } else {
    const filePath = path.resolve(imageInput);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    imageUrl = `data:${mime};base64,${base64}`;
    console.log(`📷 Loaded local file: ${filePath} (${(fileBuffer.length / 1024).toFixed(1)} KB)\n`);
  }

  // ─── Test 1: Call GPT-4o Vision ──────────────────────────────────────

  console.log("🔬 Test 1: Calling GPT-4o Vision for decomposition...");
  const startTime = Date.now();

  let result: DecompositionResult;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: "Analyze this advertisement image. Extract all text, identify the product, describe the background, and classify the layout. Return the structured JSON response.",
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    result = JSON.parse(content) as DecompositionResult;

    const durationMs = Date.now() - startTime;
    console.log(`   ✅ Response received in ${durationMs}ms`);
    console.log(`   📊 Tokens: ${response.usage?.total_tokens ?? "N/A"}\n`);
  } catch (err) {
    console.error(`   ❌ FAILED:`, err);
    process.exit(1);
  }

  // ─── Test 2: Validate Response Shape ─────────────────────────────────

  console.log("🔬 Test 2: Validating response shape...");
  const errors: string[] = [];

  if (!Array.isArray(result.texts)) errors.push("texts is not an array");
  if (!result.product) errors.push("product is missing");
  if (!result.background) errors.push("background is missing");
  if (!result.layout) errors.push("layout is missing");

  if (result.product) {
    if (typeof result.product.detected !== "boolean")
      errors.push("product.detected is not boolean");
    if (typeof result.product.description !== "string")
      errors.push("product.description is not string");
  }

  if (result.background) {
    if (!Array.isArray(result.background.dominant_colors))
      errors.push("background.dominant_colors is not array");
  }

  if (result.layout) {
    if (typeof result.layout.text_overlay_on_image !== "boolean")
      errors.push("layout.text_overlay_on_image is not boolean");
  }

  // Validate each text entry
  for (let i = 0; i < (result.texts?.length ?? 0); i++) {
    const t = result.texts[i];
    if (!t.content) errors.push(`texts[${i}].content is empty`);
    if (!["headline", "subheadline", "body", "cta", "legal", "brand"].includes(t.type))
      errors.push(`texts[${i}].type "${t.type}" is invalid`);
    if (!["top", "center", "bottom", "overlay"].includes(t.position))
      errors.push(`texts[${i}].position "${t.position}" is invalid`);
    if (typeof t.confidence !== "number" || t.confidence < 0 || t.confidence > 1)
      errors.push(`texts[${i}].confidence ${t.confidence} is out of range`);
  }

  if (errors.length === 0) {
    console.log("   ✅ All fields valid\n");
  } else {
    console.log(`   ❌ ${errors.length} validation errors:`);
    errors.forEach((e) => console.log(`      - ${e}`));
    console.log();
  }

  // ─── Test 3: Check Text Separation ───────────────────────────────────

  console.log("🔬 Test 3: Checking text separation (marketing vs product)...");
  const marketingTypes = ["headline", "subheadline", "body", "cta", "legal"];
  const productTypes = ["brand"];

  const marketingTexts = result.texts.filter((t: ExtractedText) =>
    marketingTypes.includes(t.type)
  );
  const productTexts = result.texts.filter((t: ExtractedText) =>
    productTypes.includes(t.type)
  );

  console.log(`\n   📝 MARKETING TEXT (overlay/digital):`);
  if (marketingTexts.length === 0) {
    console.log("      ⚠️  No marketing text found!");
  } else {
    marketingTexts.forEach((t: ExtractedText) => {
      console.log(
        `      [${t.type.toUpperCase()}] "${t.content}" (pos: ${t.position}, size: ${t.estimated_font_size}, conf: ${t.confidence})`
      );
    });
  }

  console.log(`\n   🏷️  PRODUCT/PACKAGING TEXT:`);
  if (productTexts.length === 0) {
    console.log("      ⚠️  No product text found!");
  } else {
    productTexts.forEach((t: ExtractedText) => {
      console.log(
        `      [${t.type.toUpperCase()}] "${t.content}" (pos: ${t.position}, size: ${t.estimated_font_size}, conf: ${t.confidence})`
      );
    });
  }

  // ─── Test 4: Product Detection ────────────────────────────────────────

  console.log(`\n🔬 Test 4: Product detection...`);
  if (result.product.detected) {
    console.log(`   ✅ Product detected:`);
    console.log(`      Description: ${result.product.description}`);
    console.log(`      Position: ${result.product.position}`);
    console.log(`      Area: ~${result.product.occupies_percent}%`);
  } else {
    console.log("   ⚠️  No product detected");
  }

  // ─── Test 5: Background & Layout ──────────────────────────────────────

  console.log(`\n🔬 Test 5: Background & Layout analysis...`);
  console.log(`   Background type: ${result.background.type}`);
  console.log(`   Dominant colors: ${result.background.dominant_colors.join(", ")}`);
  console.log(`   Description: ${result.background.description}`);
  console.log(`   Layout style: ${result.layout.style}`);
  console.log(`   Text overlay on image: ${result.layout.text_overlay_on_image}`);
  console.log(`   Brand elements: ${result.layout.brand_elements.join(", ") || "none"}`);

  // ─── Test 6: Clean Product Image (gpt-image-1 inpainting) ──────────────

  let cleanImageUrl: string | null = null;
  console.log(`\n🔬 Test 6: Clean product image generation (gpt-image-1 inpainting)...`);

  if (marketingTexts.length > 0 && result.product.detected) {
    const cleanStartTime = Date.now();
    try {
      const textsToRemove = marketingTexts.map((t: ExtractedText) => t.content);
      console.log(`   Texts to remove: ${textsToRemove.map((t: string) => `"${t}"`).join(", ")}`);

      // Use gpt-image-1 images.edit() to inpaint
      const imgResp = await fetch(imageUrl.startsWith("data:") ? imageUrl : imageUrl);
      let imgBuffer: Buffer;
      if (imageUrl.startsWith("data:")) {
        const base64Part = imageUrl.split(",")[1];
        imgBuffer = Buffer.from(base64Part, "base64");
      } else {
        imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      }

      // Convert to PNG using sharp
      const sharp = (await import("sharp")).default;
      const pngBuffer = await sharp(imgBuffer).png().toBuffer();

      const { toFile } = await import("openai");
      const file = await toFile(pngBuffer, "original.png", { type: "image/png" });

      const textList = textsToRemove.map((t: string) => `"${t}"`).join(", ");
      const prompt = `Edit this advertisement image: remove ONLY the following digitally composited marketing overlay text: ${textList}. Fill the removed text areas seamlessly with the surrounding background. Keep the product with ALL its packaging text, the background, props, and styling EXACTLY as they are. Do NOT change, move, or alter the product, its packaging, or any other visual element.`;

      const editResponse = await client.images.edit({
        model: "gpt-image-1",
        image: file,
        prompt,
        size: "1024x1024" as "1024x1024",
      });

      const b64 = editResponse.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned");

      // Save to disk for visual inspection
      const outputPath = path.join(path.dirname(path.resolve(imageInput)), "test-clean-product.png");
      fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));

      const cleanDuration = Date.now() - cleanStartTime;
      cleanImageUrl = outputPath;
      console.log(`   ✅ Clean product image generated in ${cleanDuration}ms`);
      console.log(`   📁 Saved to: ${outputPath}`);
    } catch (err) {
      console.log(`   ❌ Clean image generation failed:`, err);
    }
  } else {
    console.log("   ⚠️  Skipped (no marketing text or no product detected)");
  }

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Total texts extracted:    ${String(result.texts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Marketing texts:          ${String(marketingTexts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Product/packaging texts:  ${String(productTexts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Product detected:         ${result.product.detected ? "Yes" : "No "} ${" ".repeat(25)}║`);
  console.log(`║  Clean image generated:    ${cleanImageUrl ? "Yes" : "No "} ${" ".repeat(25)}║`);
  console.log(`║  Validation errors:        ${String(errors.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log("╠══════════════════════════════════════════════════════════╣");

  const passed =
    errors.length === 0 &&
    result.texts.length > 0 &&
    marketingTexts.length > 0 &&
    productTexts.length > 0 &&
    result.product.detected &&
    cleanImageUrl !== null;

  if (passed) {
    console.log("║  ✅ ALL TESTS PASSED                                   ║");
  } else {
    console.log("║  ❌ SOME TESTS FAILED — see details above              ║");
  }
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Print full JSON for inspection
  console.log("📋 Full decomposition result:");
  console.log(JSON.stringify(result, null, 2));
}

// ─── Main ────────────────────────────────────────────────────────────────

const input = process.argv[2];
if (!input) {
  console.error("Usage: npx tsx scripts/test-decompose.ts <image_path_or_url>");
  process.exit(1);
}

runTest(input).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
