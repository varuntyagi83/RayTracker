import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adDecompositions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";

export async function GET(
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

  const [decomposition] = await db
    .select()
    .from(adDecompositions)
    .where(and(eq(adDecompositions.id, id), eq(adDecompositions.workspaceId, workspace.id)))
    .limit(1);

  if (!decomposition) {
    return NextResponse.json({ error: "Decomposition not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: decomposition.id,
    source_image_url: decomposition.sourceImageUrl,
    source_type: decomposition.sourceType,
    source_id: decomposition.sourceId,
    processing_status: decomposition.processingStatus,
    credits_used: decomposition.creditsUsed,
    error_message: decomposition.errorMessage,
    created_at: decomposition.createdAt,
    updated_at: decomposition.updatedAt,
    ...(decomposition.processingStatus === "completed"
      ? {
          result: {
            texts: decomposition.extractedTexts,
            product: decomposition.productAnalysis,
            background: decomposition.backgroundAnalysis,
            layout: decomposition.layoutAnalysis,
            clean_image_url: decomposition.cleanImageUrl,
          },
        }
      : {}),
  });
}
