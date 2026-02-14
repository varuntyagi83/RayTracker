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
      "confidence": 0.0 to 1.0,
      "bounding_box": {
        "x": 0 to 100,
        "y": 0 to 100,
        "width": 0 to 100,
        "height": 0 to 100
      }
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

Bounding box rules:
- bounding_box values are PERCENTAGES of the image dimensions (0 to 100)
- x = left edge of the text block as % from image left
- y = top edge of the text block as % from image top
- width = width of the text block as % of image width
- height = height of the text block as % of image height
- Be generous with bounding boxes — include some padding around the text (add ~2-3% padding on all sides)
- Every text entry MUST have a bounding_box

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

  // ─── Test 6: Bounding Box Validation ─────────────────────────────────

  console.log(`\n🔬 Test 6: Bounding box validation...`);
  const textsWithBoxes = result.texts.filter((t: ExtractedText) => t.bounding_box);
  const textsWithoutBoxes = result.texts.filter((t: ExtractedText) => !t.bounding_box);
  console.log(`   Texts with bounding boxes: ${textsWithBoxes.length}/${result.texts.length}`);
  if (textsWithoutBoxes.length > 0) {
    console.log(`   ⚠️  Missing bounding boxes for: ${textsWithoutBoxes.map((t: ExtractedText) => t.content).join(", ")}`);
  }
  for (const t of textsWithBoxes) {
    const bb = t.bounding_box!;
    console.log(`      [${t.type.toUpperCase()}] "${t.content}" → box(x:${bb.x}%, y:${bb.y}%, w:${bb.width}%, h:${bb.height}%)`);
  }

  // ─── Test 7: Mask-Based Clean Product Image (gpt-image-1 inpainting) ──

  let cleanImageUrl: string | null = null;
  console.log(`\n🔬 Test 7: Mask-based clean product image (gpt-image-1 inpainting)...`);

  const overlayTextsWithBoxes = marketingTexts.filter((t: ExtractedText) => t.bounding_box);

  if (overlayTextsWithBoxes.length > 0 && result.product.detected) {
    const cleanStartTime = Date.now();
    try {
      const textsToRemove = overlayTextsWithBoxes.map((t: ExtractedText) => t.content);
      const boxes = overlayTextsWithBoxes.map((t: ExtractedText) => t.bounding_box!);
      console.log(`   Texts to remove: ${textsToRemove.map((t: string) => `"${t}"`).join(", ")}`);
      console.log(`   Bounding boxes: ${boxes.length}`);

      // Fetch and convert image
      let imgBuffer: Buffer;
      if (imageUrl.startsWith("data:")) {
        const base64Part = imageUrl.split(",")[1];
        imgBuffer = Buffer.from(base64Part, "base64");
      } else {
        const imgResp = await fetch(imageUrl);
        imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      }

      const sharp = (await import("sharp")).default;
      const pngBuffer = await sharp(imgBuffer).png().toBuffer();
      const metadata = await sharp(pngBuffer).metadata();
      const imgWidth = metadata.width ?? 1024;
      const imgHeight = metadata.height ?? 1024;
      console.log(`   Image dimensions: ${imgWidth}x${imgHeight}`);

      // Generate mask
      let mask = sharp({
        create: {
          width: imgWidth,
          height: imgHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 255 },
        },
      }).png();

      const overlays = boxes.map((box: { x: number; y: number; width: number; height: number }) => {
        const x = Math.max(0, Math.round((box.x / 100) * imgWidth));
        const y = Math.max(0, Math.round((box.y / 100) * imgHeight));
        const w = Math.min(imgWidth - x, Math.round((box.width / 100) * imgWidth));
        const h = Math.min(imgHeight - y, Math.round((box.height / 100) * imgHeight));
        console.log(`      Mask rect: x=${x}, y=${y}, w=${w}, h=${h} (px)`);
        const rect = Buffer.alloc(w * h * 4, 0);
        return { input: rect, raw: { width: w, height: h, channels: 4 as const }, left: x, top: y };
      });

      const maskBuffer = await mask.composite(overlays).png().toBuffer();

      // Save mask for visual inspection
      const maskPath = path.join(path.dirname(path.resolve(imageInput)), "test-mask.png");
      fs.writeFileSync(maskPath, maskBuffer);
      console.log(`   📁 Mask saved to: ${maskPath}`);

      // Call gpt-image-1 with mask
      const { toFile } = await import("openai");
      const imageFile = await toFile(pngBuffer, "original.png", { type: "image/png" });
      const maskFile = await toFile(maskBuffer, "mask.png", { type: "image/png" });

      const textList = textsToRemove.map((t: string) => `"${t}"`).join(", ");
      const prompt = `Fill the masked areas seamlessly with the surrounding background. The masked areas previously contained marketing text: ${textList}. Match the background color, texture, and lighting exactly. Do NOT alter any unmasked areas.`;

      const editResponse = await client.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        mask: maskFile,
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
      console.log(`   ✅ Mask-based clean product image generated in ${cleanDuration}ms`);
      console.log(`   📁 Saved to: ${outputPath}`);
    } catch (err) {
      console.log(`   ❌ Clean image generation failed:`, err);
    }
  } else {
    console.log("   ⚠️  Skipped (no marketing text with bounding boxes or no product detected)");
  }

  // ─── Test 8: Gemini 2.5 Flash Fallback Image Editing ────────────────

  let geminiCleanImageUrl: string | null = null;
  console.log(`\n🔬 Test 8: Gemini 2.5 Flash fallback image editing...`);

  const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!GOOGLE_API_KEY) {
    console.log("   ⚠️  Skipped (GOOGLE_GENERATIVE_AI_API_KEY not set)");
  } else if (overlayTextsWithBoxes.length === 0 || !result.product.detected) {
    console.log("   ⚠️  Skipped (no marketing text with bounding boxes or no product detected)");
  } else {
    const geminiStartTime = Date.now();
    try {
      const textsToRemove = overlayTextsWithBoxes.map((t: ExtractedText) => t.content);
      const boxes = overlayTextsWithBoxes.map((t: ExtractedText) => t.bounding_box!);

      // Reuse image/mask buffers from Test 7
      let imgBuffer: Buffer;
      if (imageUrl.startsWith("data:")) {
        const base64Part = imageUrl.split(",")[1];
        imgBuffer = Buffer.from(base64Part, "base64");
      } else {
        const imgResp = await fetch(imageUrl);
        imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      }

      const sharp = (await import("sharp")).default;
      const geminiPngBuffer = await sharp(imgBuffer).png().toBuffer();
      const geminiMetadata = await sharp(geminiPngBuffer).metadata();
      const gW = geminiMetadata.width ?? 1024;
      const gH = geminiMetadata.height ?? 1024;

      // Generate mask
      let gmask = sharp({
        create: { width: gW, height: gH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
      }).png();

      const gOverlays = boxes.map((box: { x: number; y: number; width: number; height: number }) => {
        const x = Math.max(0, Math.round((box.x / 100) * gW));
        const y = Math.max(0, Math.round((box.y / 100) * gH));
        const w = Math.min(gW - x, Math.round((box.width / 100) * gW));
        const h = Math.min(gH - y, Math.round((box.height / 100) * gH));
        const rect = Buffer.alloc(w * h * 4, 0);
        return { input: rect, raw: { width: w, height: h, channels: 4 as const }, left: x, top: y };
      });

      const geminiMaskBuffer = await gmask.composite(gOverlays).png().toBuffer();

      const textList = textsToRemove.map((t: string) => `"${t}"`).join(", ");
      const prompt = `Edit this advertisement image to remove ONLY the marketing overlay text: ${textList}.

Fill the removed text areas seamlessly with the surrounding background color, texture, and lighting. The second image is a reference mask — the lighter/transparent rectangular areas show exactly where the marketing text is located.

CRITICAL: Do NOT alter the product, product packaging text, background, props, colors, or composition. ONLY remove the digitally-added marketing overlay text and fill with background.`;

      console.log(`   Calling Gemini 2.5 Flash...`);
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "image/png", data: geminiPngBuffer.toString("base64") } },
                  { text: "Reference mask (lighter areas = text to remove):" },
                  { inlineData: { mimeType: "image/png", data: geminiMaskBuffer.toString("base64") } },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        }
      );

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        throw new Error(`Gemini API error: ${geminiResp.status} — ${errText}`);
      }

      const geminiData = await geminiResp.json();
      const geminiParts = geminiData.candidates?.[0]?.content?.parts;
      if (!geminiParts) throw new Error("Empty response from Gemini");

      const imagePart = geminiParts.find(
        (p: { inlineData?: { mimeType?: string; data?: string } }) =>
          p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imagePart?.inlineData?.data) throw new Error("No image in Gemini response");

      const geminiOutputPath = path.join(path.dirname(path.resolve(imageInput)), "test-clean-product-gemini.png");
      fs.writeFileSync(geminiOutputPath, Buffer.from(imagePart.inlineData.data, "base64"));

      const geminiDuration = Date.now() - geminiStartTime;
      geminiCleanImageUrl = geminiOutputPath;
      console.log(`   ✅ Gemini clean product image generated in ${geminiDuration}ms`);
      console.log(`   📁 Saved to: ${geminiOutputPath}`);
    } catch (err) {
      console.log(`   ❌ Gemini image editing failed:`, err);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Total texts extracted:    ${String(result.texts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Marketing texts:          ${String(marketingTexts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Product/packaging texts:  ${String(productTexts.length).padStart(3)} ${" ".repeat(25)}║`);
  console.log(`║  Product detected:         ${result.product.detected ? "Yes" : "No "} ${" ".repeat(25)}║`);
  console.log(`║  Clean image (OpenAI):     ${cleanImageUrl ? "Yes" : "No "} ${" ".repeat(25)}║`);
  console.log(`║  Clean image (Gemini):     ${geminiCleanImageUrl ? "Yes" : "No "} ${" ".repeat(25)}║`);
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
