import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adDecompositions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";
import type { ExtractedText, TextType } from "@/types/decomposition";

function mapTextRole(type: TextType): "headline" | "body" {
  switch (type) {
    case "headline":
      return "headline";
    default:
      return "body";
  }
}

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
    .select({
      id: adDecompositions.id,
      processingStatus: adDecompositions.processingStatus,
      extractedTexts: adDecompositions.extractedTexts,
    })
    .from(adDecompositions)
    .where(and(eq(adDecompositions.id, id), eq(adDecompositions.workspaceId, workspace.id)))
    .limit(1);

  if (!decomposition) {
    return NextResponse.json({ error: "Decomposition not found" }, { status: 404 });
  }

  if (decomposition.processingStatus !== "completed") {
    return NextResponse.json({ error: "Decomposition is not completed yet" }, { status: 400 });
  }

  const allTexts = decomposition.extractedTexts as ExtractedText[];
  const marketingTexts = allTexts
    .filter((t) => t.type !== "brand")
    .map((t) => ({
      content: t.content,
      type: t.type,
      role: mapTextRole(t.type),
      position: t.position,
      estimated_font_size: t.estimated_font_size,
      confidence: t.confidence,
    }));

  return NextResponse.json({ decomposition_id: id, texts: marketingTexts });
}
