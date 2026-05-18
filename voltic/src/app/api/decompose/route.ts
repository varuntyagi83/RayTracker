import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adDecompositions } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";
import { trackServer } from "@/lib/analytics/posthog-server";
import { downloadImage, decomposeAdImage, generateCleanProductImage } from "@/lib/ai/decompose";
import { checkAndDeductCredits, refundCredits } from "@/lib/data/insights";
import {
  DECOMPOSITION_ANALYSIS_COST,
  DECOMPOSITION_CLEAN_IMAGE_COST,
} from "@/types/decomposition";
import type { SourceType } from "@/types/decomposition";

/** Block SSRF: reject URLs pointing at private/internal networks */
function isPublicUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    if (protocol !== "https:") return false;
    const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0)/i;
    return !BLOCKED.test(hostname);
  } catch {
    return false;
  }
}

const decomposeSchema = z.object({
  image_url: z.string().url("Invalid image URL").refine(isPublicUrl, "Image URL must be a public HTTPS URL"),
  source_type: z.enum(["saved_ad", "discover", "upload"] as const),
  source_id: z.string().uuid().optional(),
  generate_clean_image: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof decomposeSchema>;
  try {
    const raw = await request.json();
    body = decomposeSchema.parse(raw);
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }
  const workspaceId = workspace.id;

  // Check cache: same image URL already decomposed in this workspace
  const [cached] = await db
    .select({
      id: adDecompositions.id,
      processingStatus: adDecompositions.processingStatus,
      extractedTexts: adDecompositions.extractedTexts,
      productAnalysis: adDecompositions.productAnalysis,
      backgroundAnalysis: adDecompositions.backgroundAnalysis,
      layoutAnalysis: adDecompositions.layoutAnalysis,
      cleanImageUrl: adDecompositions.cleanImageUrl,
    })
    .from(adDecompositions)
    .where(
      and(
        eq(adDecompositions.workspaceId, workspaceId),
        eq(adDecompositions.sourceImageUrl, body.image_url),
        eq(adDecompositions.processingStatus, "completed")
      )
    )
    .orderBy(desc(adDecompositions.createdAt))
    .limit(1);

  if (cached) {
    let cleanImageUrl = cached.cleanImageUrl;
    if (body.generate_clean_image && !cleanImageUrl) {
      cleanImageUrl = body.image_url;
      await db
        .update(adDecompositions)
        .set({ cleanImageUrl, updatedAt: new Date() })
        .where(and(eq(adDecompositions.id, cached.id), eq(adDecompositions.workspaceId, workspaceId)));
    }

    return NextResponse.json({
      decomposition_id: cached.id,
      cached: true,
      result: {
        texts: cached.extractedTexts ?? [],
        product: cached.productAnalysis ?? { detected: false, description: "", position: "center", occupies_percent: 0 },
        background: cached.backgroundAnalysis ?? { type: "solid_color", dominant_colors: [], description: "" },
        layout: cached.layoutAnalysis ?? { style: "product_hero", text_overlay_on_image: false, brand_elements: [] },
        clean_image_url: cleanImageUrl,
      },
    });
  }

  const totalCost =
    DECOMPOSITION_ANALYSIS_COST +
    (body.generate_clean_image ? DECOMPOSITION_CLEAN_IMAGE_COST : 0);

  const creditResult = await checkAndDeductCredits(workspaceId, totalCost, "decomposition");
  if (!creditResult.success) {
    return NextResponse.json(
      { error: creditResult.error ?? "Insufficient credits" },
      { status: 402 }
    );
  }

  const [record] = await db
    .insert(adDecompositions)
    .values({
      workspaceId,
      sourceImageUrl: body.image_url,
      sourceType: body.source_type as SourceType,
      sourceId: body.source_id ?? null,
      processingStatus: "analyzing",
      creditsUsed: totalCost,
    })
    .returning({ id: adDecompositions.id });

  if (!record) {
    return NextResponse.json({ error: "Failed to create decomposition record" }, { status: 500 });
  }

  const decompositionId = record.id;

  trackServer("ad_decomposition_started", userId, {
    source_type: body.source_type,
    source_id: body.source_id,
    generate_clean_image: body.generate_clean_image,
  });

  const startTime = Date.now();

  try {
    const imageBuffer = await downloadImage(body.image_url);
    const result = await decomposeAdImage(imageBuffer);

    let cleanImageUrl: string | null = null;
    if (body.generate_clean_image && result.product.detected) {
      try {
        const overlayTexts = result.texts.filter(
          (t) =>
            t.type !== "brand" ||
            (t.estimated_font_size === "large" && (t.position === "top" || t.position === "overlay")) ||
            (t.estimated_font_size === "medium" && t.position === "top")
        );
        const marketingTexts = overlayTexts.map((t) => t.content);
        const boundingBoxes = overlayTexts.filter((t) => t.bounding_box).map((t) => t.bounding_box!);

        if (marketingTexts.length > 0 && boundingBoxes.length > 0) {
          cleanImageUrl = await generateCleanProductImage(imageBuffer, marketingTexts, boundingBoxes, workspaceId, decompositionId);
        } else {
          cleanImageUrl = body.image_url;
        }
      } catch (cleanErr) {
        console.error("[decompose] Clean image generation failed:", cleanErr);
      }
    }

    await db
      .update(adDecompositions)
      .set({
        extractedTexts: result.texts,
        productAnalysis: result.product,
        backgroundAnalysis: result.background,
        layoutAnalysis: result.layout,
        cleanImageUrl,
        processingStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(adDecompositions.id, decompositionId));

    trackServer("ad_decomposition_completed", userId, {
      decomposition_id: decompositionId,
      texts_found: result.texts.length,
      product_detected: result.product.detected,
      duration_ms: Date.now() - startTime,
      credits_used: totalCost,
    });

    return NextResponse.json({
      decomposition_id: decompositionId,
      cached: false,
      result: {
        texts: result.texts,
        product: result.product,
        background: result.background,
        layout: result.layout,
        clean_image_url: cleanImageUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await refundCredits(workspaceId, totalCost);

    await db
      .update(adDecompositions)
      .set({ processingStatus: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(adDecompositions.id, decompositionId));

    trackServer("ad_decomposition_failed", userId, { decomposition_id: decompositionId, error: message });

    console.error("[decompose] Error:", { workspace_id: workspaceId, error: message });
    return NextResponse.json({ error: `${message}. Credits have been refunded.` }, { status: 500 });
  }
}
