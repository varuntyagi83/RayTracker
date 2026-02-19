import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { getOpenAIClient } from "@/lib/ai/openai";
import { getBrandGuidelineById } from "@/lib/data/brand-guidelines-entities";
import { uploadAssetImage, createAsset } from "@/lib/data/assets";
import type { ColorSwatch } from "@/types/brand-guidelines";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandGuidelineId, prompt } = await request.json();
    if (!brandGuidelineId) {
      return NextResponse.json(
        { error: "brandGuidelineId is required" },
        { status: 400 }
      );
    }

    // Fetch brand guideline
    const guideline = await getBrandGuidelineById(workspace.id, brandGuidelineId);
    if (!guideline) {
      return NextResponse.json(
        { error: "Brand guideline not found" },
        { status: 404 }
      );
    }

    // Build prompt from brand guideline data
    const colors = (guideline.colorPalette as ColorSwatch[])
      .map((c) => `${c.hex} (${c.name})`)
      .join(", ");

    const basePrompt =
      `Create a professional advertising background image suitable for text overlay. ` +
      `Brand: ${guideline.brandName ?? guideline.name}. ` +
      (colors ? `Use these brand colors as inspiration: ${colors}. ` : "") +
      (guideline.targetAudience
        ? `Target audience: ${guideline.targetAudience}. `
        : "") +
      `The background should be clean, modern, and leave space for text. ` +
      `No text or words in the image. ` +
      (prompt ? `Additional direction: ${prompt}` : "");

    const openai = getOpenAIClient();

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: basePrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Upload to storage
    const buffer = Buffer.from(imageData.b64_json, "base64");
    const fileName = `bg-${Date.now()}.png`;
    const upload = await uploadAssetImage(workspace.id, fileName, buffer, "image/png");
    if (upload.error || !upload.url) {
      return NextResponse.json(
        { error: upload.error ?? "Upload failed" },
        { status: 500 }
      );
    }

    // Create asset record linked to the guideline
    const assetName = `Background - ${guideline.name}`;
    const result = await createAsset(
      workspace.id,
      assetName,
      upload.url,
      `AI-generated background for ${guideline.brandName ?? guideline.name}`,
      brandGuidelineId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to save asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: result.id,
        name: assetName,
        imageUrl: upload.url,
        brandGuidelineId,
      },
    });
  } catch (err) {
    console.error("Generate background error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
