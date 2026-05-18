import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adDecompositions } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";
import { trackServer } from "@/lib/analytics/posthog-server";
import { downloadImage, decomposeAdImage, generateCleanProductImage } from "@/lib/ai/decompose";
import { checkAndDeductCredits } from "@/lib/data/insights";
import {
  DECOMPOSITION_ANALYSIS_COST,
  DECOMPOSITION_CLEAN_IMAGE_COST,
  DECOMPOSITION_BATCH_MAX,
} from "@/types/decomposition";

const batchSchema = z.object({
  image_urls: z
    .array(z.string().url())
    .min(1, "At least 1 image required")
    .max(DECOMPOSITION_BATCH_MAX, `Max ${DECOMPOSITION_BATCH_MAX} images per batch`),
  source_type: z.enum(["saved_ad", "discover", "upload"] as const),
  generate_clean_images: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof batchSchema>;
  try {
    const raw = await request.json();
    body = batchSchema.parse(raw);
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }
  const workspaceId = workspace.id;

  const existingDecomps = await db
    .select({ id: adDecompositions.id, sourceImageUrl: adDecompositions.sourceImageUrl })
    .from(adDecompositions)
    .where(
      and(
        eq(adDecompositions.workspaceId, workspaceId),
        eq(adDecompositions.processingStatus, "completed"),
        inArray(adDecompositions.sourceImageUrl, body.image_urls)
      )
    );

  const cachedUrls = new Set(existingDecomps.map((d) => d.sourceImageUrl));
  const newUrls = body.image_urls.filter((url) => !cachedUrls.has(url));

  const perImageCost =
    DECOMPOSITION_ANALYSIS_COST +
    (body.generate_clean_images ? DECOMPOSITION_CLEAN_IMAGE_COST : 0);
  const totalCost = newUrls.length * perImageCost;

  if (totalCost > 0) {
    const creditResult = await checkAndDeductCredits(workspaceId, totalCost, "decomposition");
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error ?? "Insufficient credits" },
        { status: 402 }
      );
    }
  }

  trackServer("ad_decomposition_batch_started", userId, {
    count: body.image_urls.length,
    total_credits: totalCost,
  });

  const results: Array<{
    image_url: string;
    decomposition_id: string;
    cached: boolean;
    status: "completed" | "failed";
    error?: string;
  }> = [];

  for (const decomp of existingDecomps) {
    results.push({
      image_url: decomp.sourceImageUrl,
      decomposition_id: decomp.id,
      cached: true,
      status: "completed",
    });
  }

  for (const imageUrl of newUrls) {
    const [record] = await db
      .insert(adDecompositions)
      .values({
        workspaceId,
        sourceImageUrl: imageUrl,
        sourceType: body.source_type,
        processingStatus: "analyzing",
        creditsUsed: perImageCost,
      })
      .returning({ id: adDecompositions.id });

    if (!record) {
      results.push({ image_url: imageUrl, decomposition_id: "", cached: false, status: "failed", error: "Failed to create record" });
      continue;
    }

    try {
      const imageBuffer = await downloadImage(imageUrl);
      const decomResult = await decomposeAdImage(imageBuffer);

      let cleanImageUrl: string | null = null;
      if (body.generate_clean_images && decomResult.product.detected) {
        try {
          const overlayTexts = decomResult.texts.filter((t) => t.type !== "brand");
          const marketingTexts = overlayTexts.map((t) => t.content);
          const boundingBoxes = overlayTexts.filter((t) => t.bounding_box).map((t) => t.bounding_box!);
          if (marketingTexts.length > 0 && boundingBoxes.length > 0) {
            cleanImageUrl = await generateCleanProductImage(imageBuffer, marketingTexts, boundingBoxes, workspaceId, record.id);
          } else {
            cleanImageUrl = imageUrl;
          }
        } catch {
          // Non-fatal
        }
      }

      await db
        .update(adDecompositions)
        .set({
          extractedTexts: decomResult.texts,
          productAnalysis: decomResult.product,
          backgroundAnalysis: decomResult.background,
          layoutAnalysis: decomResult.layout,
          cleanImageUrl,
          processingStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(adDecompositions.id, record.id));

      results.push({ image_url: imageUrl, decomposition_id: record.id, cached: false, status: "completed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await db
        .update(adDecompositions)
        .set({ processingStatus: "failed", errorMessage: message, updatedAt: new Date() })
        .where(eq(adDecompositions.id, record.id));

      results.push({ image_url: imageUrl, decomposition_id: record.id, cached: false, status: "failed", error: message });
    }
  }

  return NextResponse.json({
    total: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    failed: results.filter((r) => r.status === "failed").length,
    cached: results.filter((r) => r.cached).length,
    results,
  });
}
