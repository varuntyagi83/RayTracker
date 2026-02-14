import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackServer } from "@/lib/analytics/posthog-server";
import { decomposeAdImage, generateCleanProductImage } from "@/lib/ai/decompose";
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
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse & validate
  let body: z.infer<typeof batchSchema>;
  try {
    const raw = await request.json();
    body = batchSchema.parse(raw);
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Get workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const workspaceId = member.workspace_id;

  // 4. Filter out already-cached images
  const { data: existingDecomps } = await admin
    .from("ad_decompositions")
    .select("id, source_image_url")
    .eq("workspace_id", workspaceId)
    .eq("processing_status", "completed")
    .in("source_image_url", body.image_urls);

  const cachedUrls = new Set(
    (existingDecomps ?? []).map((d) => d.source_image_url)
  );
  const newUrls = body.image_urls.filter((url) => !cachedUrls.has(url));

  // 5. Calculate credit cost for new images only
  const perImageCost =
    DECOMPOSITION_ANALYSIS_COST +
    (body.generate_clean_images ? DECOMPOSITION_CLEAN_IMAGE_COST : 0);
  const totalCost = newUrls.length * perImageCost;

  if (totalCost > 0) {
    const creditResult = await checkAndDeductCredits(
      workspaceId,
      totalCost,
      "decomposition"
    );

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error ?? "Insufficient credits" },
        { status: 402 }
      );
    }
  }

  trackServer("ad_decomposition_batch_started", user.id, {
    count: body.image_urls.length,
    total_credits: totalCost,
  });

  // 6. Process each new image
  const results: Array<{
    image_url: string;
    decomposition_id: string;
    cached: boolean;
    status: "completed" | "failed";
    error?: string;
  }> = [];

  // Add cached results
  for (const decomp of existingDecomps ?? []) {
    results.push({
      image_url: decomp.source_image_url,
      decomposition_id: decomp.id,
      cached: true,
      status: "completed",
    });
  }

  // Process new images sequentially to avoid rate limits
  for (const imageUrl of newUrls) {
    // Create pending record
    const { data: record, error: insertErr } = await admin
      .from("ad_decompositions")
      .insert({
        workspace_id: workspaceId,
        source_image_url: imageUrl,
        source_type: body.source_type,
        processing_status: "analyzing",
        credits_used: perImageCost,
      })
      .select("id")
      .single();

    if (insertErr || !record) {
      results.push({
        image_url: imageUrl,
        decomposition_id: "",
        cached: false,
        status: "failed",
        error: "Failed to create record",
      });
      continue;
    }

    try {
      const decomResult = await decomposeAdImage(imageUrl);

      let cleanImageUrl: string | null = null;
      if (body.generate_clean_images && decomResult.product.detected) {
        try {
          const overlayTexts = decomResult.texts.filter((t) => t.type !== "brand");
          const marketingTexts = overlayTexts.map((t) => t.content);
          const boundingBoxes = overlayTexts
            .filter((t) => t.bounding_box)
            .map((t) => t.bounding_box!);

          if (marketingTexts.length > 0 && boundingBoxes.length > 0) {
            cleanImageUrl = await generateCleanProductImage(
              imageUrl,
              marketingTexts,
              boundingBoxes,
              workspaceId,
              record.id
            );
          }
        } catch {
          // Non-fatal
        }
      }

      await admin
        .from("ad_decompositions")
        .update({
          extracted_texts: decomResult.texts,
          product_analysis: decomResult.product,
          background_analysis: decomResult.background,
          layout_analysis: decomResult.layout,
          clean_image_url: cleanImageUrl,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      results.push({
        image_url: imageUrl,
        decomposition_id: record.id,
        cached: false,
        status: "completed",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await admin
        .from("ad_decompositions")
        .update({
          processing_status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      results.push({
        image_url: imageUrl,
        decomposition_id: record.id,
        cached: false,
        status: "failed",
        error: message,
      });
    }
  }

  const completed = results.filter((r) => r.status === "completed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    total: results.length,
    completed,
    failed,
    cached: results.filter((r) => r.cached).length,
    results,
  });
}
