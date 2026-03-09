import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { getGeneratedAd } from "@/lib/data/ads";

/** Block SSRF: reject URLs pointing at private/internal networks */
function isPublicUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    if (protocol !== "https:") return false;
    const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0)/i;
    return !BLOCKED.test(hostname);
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let workspaceId: string | undefined;
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    workspaceId = workspace.id;

    const { id } = await params;
    const ad = await getGeneratedAd(workspace.id, id);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Validate URL before fetching to prevent SSRF
    if (!ad.imageUrl || !isPublicUrl(ad.imageUrl)) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
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
    console.error("[download] Error:", { workspace_id: workspaceId, error: err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
