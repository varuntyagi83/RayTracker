import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateExtensionToken } from "@/lib/extension/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const saveAdSchema = z.object({
  boardId: z.string().uuid(),
  ad: z.object({
    metaLibraryId: z.string().nullable().optional(),
    brandName: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    format: z.string().default("image"),
    imageUrl: z.string().nullable().optional(),
    landingPageUrl: z.string().nullable().optional(),
    platforms: z.array(z.string()).nullable().optional(),
    startDate: z.string().nullable().optional(),
    runtimeDays: z.number().nullable().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const auth = await validateExtensionToken(token);
  if (!auth.valid || !auth.workspaceId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  // Parse and validate body
  let body: z.infer<typeof saveAdSchema>;
  try {
    body = saveAdSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify board belongs to this workspace
  const { data: board } = await supabase
    .from("boards")
    .select("id")
    .eq("id", body.boardId)
    .eq("workspace_id", auth.workspaceId)
    .single();

  if (!board) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404 }
    );
  }

  // Duplicate check: skip if same meta_library_id already in this board
  if (body.ad.metaLibraryId) {
    const { data: existing } = await supabase
      .from("saved_ads")
      .select("id")
      .eq("board_id", body.boardId)
      .eq("meta_library_id", body.ad.metaLibraryId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Ad already saved to this board",
      });
    }
  }

  // Insert the ad
  const { error } = await supabase.from("saved_ads").insert({
    board_id: body.boardId,
    workspace_id: auth.workspaceId,
    source: "extension",
    meta_library_id: body.ad.metaLibraryId ?? null,
    brand_name: body.ad.brandName ?? null,
    headline: body.ad.headline ?? null,
    body: body.ad.body ?? null,
    format: body.ad.format,
    image_url: body.ad.imageUrl ?? null,
    landing_page_url: body.ad.landingPageUrl ?? null,
    platforms: body.ad.platforms ?? null,
    start_date: body.ad.startDate ?? null,
    runtime_days: body.ad.runtimeDays ?? null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save ad" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
