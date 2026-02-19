import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getWorkspace } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiLimiter } from "@/lib/utils/rate-limit";
import { createAsset } from "@/lib/data/assets";

export const runtime = "nodejs";
export const maxDuration = 180;

const schema = z.object({
  prompt: z.string().min(1).max(4000),
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1024"),
  quality: z.enum(["low", "medium", "high"]).default("high"),
  brandGuidelineId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = aiLimiter.check(workspace.id, 10);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { prompt, messageId, conversationId, size, quality, brandGuidelineId } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    // Generate image with GPT Image
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      output_format: "png",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "No image returned from GPT Image" },
        { status: 500 }
      );
    }

    // Decode base64 and upload to Supabase Storage
    const imageBuffer = Buffer.from(b64, "base64");
    const storagePath = `${workspace.id}/studio/generated/${Date.now()}-gpt-image.png`;

    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(storagePath, imageBuffer, { contentType: "image/png" });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("brand-assets").getPublicUrl(storagePath);

    // Append the image to the assistant message's attachments
    const { data: existing } = await supabase
      .from("studio_messages")
      .select("attachments")
      .eq("id", messageId)
      .eq("workspace_id", workspace.id)
      .single();

    const currentAttachments = (existing?.attachments ?? []) as Array<{
      url: string;
      name: string;
      type: string;
      size: number;
    }>;

    const newAttachment = {
      url: publicUrl,
      name: "generated-image.png",
      type: "image/png",
      size: imageBuffer.length,
    };

    await supabase
      .from("studio_messages")
      .update({ attachments: [...currentAttachments, newAttachment] })
      .eq("id", messageId)
      .eq("workspace_id", workspace.id);

    // Also save as an asset record, linked to brand guideline if available
    let resolvedGuidelineId = brandGuidelineId;

    // If no explicit guideline ID, check conversation messages for brand guideline @mentions
    if (!resolvedGuidelineId) {
      const { data: messages } = await supabase
        .from("studio_messages")
        .select("mentions")
        .eq("conversation_id", conversationId)
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages) {
        for (const msg of messages) {
          const mentions = (msg.mentions ?? []) as Array<{
            type: string;
            id: string;
            name: string;
          }>;
          const guidelineMention = mentions.find(
            (m) => m.type === "brand_guidelines"
          );
          if (guidelineMention) {
            resolvedGuidelineId = guidelineMention.id;
            break;
          }
        }
      }
    }

    // Derive a short name from the prompt
    const assetName =
      prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt;

    await createAsset(
      workspace.id,
      assetName,
      publicUrl,
      `AI-generated via Creative Studio`,
      resolvedGuidelineId
    );

    return NextResponse.json({
      url: publicUrl,
      attachment: newAttachment,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const msg =
      error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
