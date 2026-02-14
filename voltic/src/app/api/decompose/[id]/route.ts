import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 3. Fetch decomposition (workspace-scoped)
  const { data: decomposition, error } = await admin
    .from("ad_decompositions")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", member.workspace_id)
    .single();

  if (error || !decomposition) {
    return NextResponse.json(
      { error: "Decomposition not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: decomposition.id,
    source_image_url: decomposition.source_image_url,
    source_type: decomposition.source_type,
    source_id: decomposition.source_id,
    processing_status: decomposition.processing_status,
    credits_used: decomposition.credits_used,
    error_message: decomposition.error_message,
    created_at: decomposition.created_at,
    updated_at: decomposition.updated_at,
    ...(decomposition.processing_status === "completed"
      ? {
          result: {
            texts: decomposition.extracted_texts,
            product: decomposition.product_analysis,
            background: decomposition.background_analysis,
            layout: decomposition.layout_analysis,
            clean_image_url: decomposition.clean_image_url,
          },
        }
      : {}),
  });
}
