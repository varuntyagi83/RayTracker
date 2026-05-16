import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { aiLimiter } from "@/lib/utils/rate-limit";
import { createAsset } from "@/lib/data/assets";
import { uploadBrandAsset } from "@/lib/storage/brand-assets";
import { db } from "@/lib/db";
import { studioMessages } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

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
  const rl = await aiLimiter.check(workspace.id, 10);
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

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    // Generate image with Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => "");
      return NextResponse.json(
        { error: `Gemini image generation failed: ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const geminiJson = await geminiResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string } }> } }>;
    };
    const b64 = geminiJson.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!b64) {
      return NextResponse.json(
        { error: "No image returned from Gemini" },
        { status: 500 }
      );
    }

    // Decode base64 and upload to R2 storage
    const imageBuffer = Buffer.from(b64, "base64");
    const storagePath = `${workspace.id}/studio/generated/${Date.now()}-gemini-image.png`;

    const publicUrl = await uploadBrandAsset(storagePath, imageBuffer, "image/png");

    // Append the image to the assistant message's attachments
    const existing = await db
      .select({ attachments: studioMessages.attachments })
      .from(studioMessages)
      .where(
        and(
          eq(studioMessages.id, messageId),
          eq(studioMessages.workspaceId, workspace.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

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

    await db
      .update(studioMessages)
      .set({ attachments: [...currentAttachments, newAttachment] })
      .where(
        and(
          eq(studioMessages.id, messageId),
          eq(studioMessages.workspaceId, workspace.id)
        )
      );

    // Also save as an asset record, linked to brand guideline if available
    let resolvedGuidelineId = brandGuidelineId;

    // If no explicit guideline ID, check conversation messages for brand guideline @mentions
    if (!resolvedGuidelineId) {
      const messages = await db
        .select({ mentions: studioMessages.mentions })
        .from(studioMessages)
        .where(
          and(
            eq(studioMessages.conversationId, conversationId),
            eq(studioMessages.workspaceId, workspace.id)
          )
        )
        .orderBy(desc(studioMessages.createdAt))
        .limit(10);

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
    console.error("[generate-image] Error:", { workspace_id: workspace.id, error });
    const msg =
      error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
