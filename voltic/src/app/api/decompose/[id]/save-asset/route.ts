import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adDecompositions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";
import { createAsset } from "@/lib/data/assets";
import { trackServer } from "@/lib/analytics/posthog-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }
  const workspaceId = workspace.id;

  const [decomposition] = await db
    .select({
      id: adDecompositions.id,
      processingStatus: adDecompositions.processingStatus,
      cleanImageUrl: adDecompositions.cleanImageUrl,
      productAnalysis: adDecompositions.productAnalysis,
      sourceImageUrl: adDecompositions.sourceImageUrl,
    })
    .from(adDecompositions)
    .where(and(eq(adDecompositions.id, id), eq(adDecompositions.workspaceId, workspaceId)))
    .limit(1);

  if (!decomposition) {
    return NextResponse.json({ error: "Decomposition not found" }, { status: 404 });
  }

  if (decomposition.processingStatus !== "completed") {
    return NextResponse.json({ error: "Decomposition is not completed yet" }, { status: 400 });
  }

  const imageUrl = decomposition.cleanImageUrl ?? decomposition.sourceImageUrl;
  if (!imageUrl) {
    return NextResponse.json({ error: "No image URL available for this decomposition" }, { status: 400 });
  }

  const product = decomposition.productAnalysis as { description?: string; detected?: boolean };
  const name = product?.description ? product.description.slice(0, 100) : "Extracted product image";
  const description = `Extracted from ad decomposition${decomposition.cleanImageUrl ? " (marketing text removed)" : ""}`;

  const result = await createAsset(workspaceId, name, imageUrl, description);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Failed to create asset" }, { status: 500 });
  }

  trackServer("decomposition_saved_as_asset", userId, {
    decomposition_id: id,
    asset_id: result.id!,
    has_clean_image: !!decomposition.cleanImageUrl,
  });

  return NextResponse.json({ asset_id: result.id, name, image_url: imageUrl });
}
