import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { getGeneratedAd } from "@/lib/data/ads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ad = await getGeneratedAd(workspace.id, id);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Fetch the image
    const response = await fetch(ad.imageUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 500 }
      );
    }

    const buffer = await response.arrayBuffer();
    const fileName = `ad-${ad.textVariant.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}-${id.slice(0, 8)}.png`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
