import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackServer } from "@/lib/analytics/posthog-server";
import { decomposeAdImage, generateCleanImage } from "@/lib/ai/decompose";
import { checkAndDeductCredits } from "@/lib/data/insights";
import {
  DECOMPOSITION_ANALYSIS_COST,
  DECOMPOSITION_CLEAN_IMAGE_COST,
} from "@/types/decomposition";
import type { SourceType } from "@/types/decomposition";

const decomposeSchema = z.object({
  image_url: z.string().url("Invalid image URL"),
  source_type: z.enum(["saved_ad", "discover", "upload"] as const),
  source_id: z.string().uuid().optional(),
  generate_clean_image: z.boolean().optional().default(false),
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

  // 2. Parse & validate body
  let body: z.infer<typeof decomposeSchema>;
  try {
    const raw = await request.json();
    body = decomposeSchema.parse(raw);
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

  // 4. Check for cached result (same image URL + workspace)
  const { data: cached } = await admin
    .from("ad_decompositions")
    .select("id, processing_status")
    .eq("workspace_id", workspaceId)
    .eq("source_image_url", body.image_url)
    .eq("processing_status", "completed")
    .single();

  if (cached) {
    return NextResponse.json({
      decomposition_id: cached.id,
      cached: true,
    });
  }

  // 5. Calculate credit cost & check balance
  const totalCost =
    DECOMPOSITION_ANALYSIS_COST +
    (body.generate_clean_image ? DECOMPOSITION_CLEAN_IMAGE_COST : 0);

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

  // 6. Create pending record
  const { data: record, error: insertErr } = await admin
    .from("ad_decompositions")
    .insert({
      workspace_id: workspaceId,
      source_image_url: body.image_url,
      source_type: body.source_type,
      source_id: body.source_id ?? null,
      processing_status: "analyzing",
      credits_used: totalCost,
    })
    .select("id")
    .single();

  if (insertErr || !record) {
    return NextResponse.json(
      { error: "Failed to create decomposition record" },
      { status: 500 }
    );
  }

  const decompositionId = record.id;

  trackServer("ad_decomposition_started", user.id, {
    source_type: body.source_type,
    source_id: body.source_id,
    generate_clean_image: body.generate_clean_image,
  });

  // 7. Run decomposition
  const startTime = Date.now();

  try {
    const result = await decomposeAdImage(body.image_url);

    let cleanImageUrl: string | null = null;
    if (body.generate_clean_image && result.product.detected) {
      try {
        cleanImageUrl = await generateCleanImage(
          body.image_url,
          result.product.description
        );
      } catch (cleanErr) {
        // Non-fatal: clean image generation can fail without failing the whole decomposition
        console.error("[decompose] Clean image generation failed:", cleanErr);
      }
    }

    // 8. Update record with results
    await admin
      .from("ad_decompositions")
      .update({
        extracted_texts: result.texts,
        product_analysis: result.product,
        background_analysis: result.background,
        layout_analysis: result.layout,
        clean_image_url: cleanImageUrl,
        processing_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", decompositionId);

    const durationMs = Date.now() - startTime;

    trackServer("ad_decomposition_completed", user.id, {
      decomposition_id: decompositionId,
      texts_found: result.texts.length,
      product_detected: result.product.detected,
      duration_ms: durationMs,
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

    // Mark as failed
    await admin
      .from("ad_decompositions")
      .update({
        processing_status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", decompositionId);

    trackServer("ad_decomposition_failed", user.id, {
      decomposition_id: decompositionId,
      error: message,
    });

    console.error("[decompose] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
