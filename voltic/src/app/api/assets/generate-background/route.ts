import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { getOpenAIClient } from "@/lib/ai/openai";
import { getBrandGuidelineById } from "@/lib/data/brand-guidelines-entities";
import { uploadAssetImage, createAsset } from "@/lib/data/assets";
import { aiLimiter } from "@/lib/utils/rate-limit";
import { sanitizeForPrompt } from "@/lib/utils/prompt-sanitize";
import type { ColorSwatch } from "@/types/brand-guidelines";

export const maxDuration = 120;

// Input validation — C-10
const schema = z.object({
  brandGuidelineId: z.string().uuid("brandGuidelineId must be a valid UUID"),
  prompt: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  let workspaceId: string | undefined;
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    workspaceId = workspace.id;

    // Rate limiting — H-28
    const rl = await aiLimiter.check(workspace.id, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests — please wait before generating another background" },
        { status: 429 }
      );
    }

    // Validate input — C-10
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { brandGuidelineId, prompt } = parsed.data;

    // Fetch brand guideline
    const guideline = await getBrandGuidelineById(workspace.id, brandGuidelineId);
    if (!guideline) {
      return NextResponse.json(
        { error: "Brand guideline not found" },
        { status: 404 }
      );
    }

    // Build prompt from brand guideline data.
    // Sanitize guideline fields before embedding in the AI prompt (C-9).
    const colors = (guideline.colorPalette as ColorSwatch[])
      .map((c) => `${c.hex} (${c.name})`)
      .join(", ");

    const basePrompt =
      `Create a professional advertising background image suitable for text overlay. ` +
      `Brand: ${sanitizeForPrompt(guideline.brandName ?? guideline.name, 200)}. ` +
      (colors ? `Use these brand colors as inspiration: ${sanitizeForPrompt(colors, 200)}. ` : "") +
      (guideline.targetAudience
        ? `Target audience: ${sanitizeForPrompt(guideline.targetAudience, 300)}. `
        : "") +
      `The background should be clean, modern, and leave space for text. ` +
      `No text or words in the image. ` +
      (prompt ? `Additional direction: ${sanitizeForPrompt(prompt, 500)}` : "");

    const openai = getOpenAIClient();

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: basePrompt,
      size: "1024x1024",
      quality: "high",
      output_format: "png",
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
    console.error("[generate-background] Error:", { workspace_id: workspaceId, error: err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
