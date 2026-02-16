import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAsset } from "@/lib/data/assets";
import { trackServer } from "@/lib/analytics/posthog-server";

export async function POST(
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

  const workspaceId = member.workspace_id;

  // 3. Fetch decomposition (must be completed with clean_image_url)
  const { data: decomposition, error } = await admin
    .from("ad_decompositions")
    .select(
      "id, processing_status, clean_image_url, product_analysis, source_image_url"
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
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

  // Use clean image if available, otherwise fall back to source image
  const imageUrl =
    decomposition.clean_image_url ?? decomposition.source_image_url;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image URL available for this decomposition" },
      { status: 400 }
    );
  }

  // 4. Extract product info for asset name/description
  const product = decomposition.product_analysis as {
    description?: string;
    detected?: boolean;
  };
  const name = product?.description
    ? product.description.slice(0, 100)
    : "Extracted product image";
  const description = `Extracted from ad decomposition${
    decomposition.clean_image_url ? " (marketing text removed)" : ""
  }`;

  // 5. Create asset using existing data layer
  const result = await createAsset(workspaceId, name, imageUrl, description);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to create asset" },
      { status: 500 }
    );
  }

  trackServer("decomposition_saved_as_asset", user.id, {
    decomposition_id: id,
    asset_id: result.id!,
    has_clean_image: !!decomposition.clean_image_url,
  });

  return NextResponse.json({
    asset_id: result.id,
    name,
    image_url: imageUrl,
  });
}
