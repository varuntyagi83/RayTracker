import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExtractedText, TextType } from "@/types/decomposition";

/** Maps decomposition text types to Creative Builder roles */
function mapTextRole(type: TextType): "headline" | "body" {
  switch (type) {
    case "headline":
      return "headline";
    case "subheadline":
    case "body":
    case "cta":
    case "legal":
      return "body";
    default:
      return "body";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 2. Get workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  // 3. Fetch decomposition
  const { data: decomposition, error } = await admin
    .from("ad_decompositions")
    .select("id, processing_status, extracted_texts")
    .eq("id", id)
    .eq("workspace_id", member.workspace_id)
    .single();

  if (error || !decomposition) {
    return NextResponse.json(
      { error: "Decomposition not found" },
      { status: 404 }
    );
  }

  if (decomposition.processing_status !== "completed") {
    return NextResponse.json(
      { error: "Decomposition is not completed yet" },
      { status: 400 }
    );
  }

  // 4. Filter to marketing-only texts (exclude product/packaging text)
  const allTexts = decomposition.extracted_texts as ExtractedText[];
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

  return NextResponse.json({
    decomposition_id: id,
    texts: marketingTexts,
  });
}
