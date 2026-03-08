import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { compositeTextOnImage } from "@/lib/compositing/text-overlay";
import { uploadAdImage } from "@/lib/data/ads";

export const maxDuration = 60;

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

const TEXT_POSITION_TYPES = ["center", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right", "custom"] as const;

const compositeSchema = z.object({
  backgroundImageUrl: z.string().url(),
  text: z.string().min(1).max(500),
  fontFamily: z.string().max(100).default("Inter"),
  fontSize: z.number().int().min(8).max(200).default(48),
  textColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "textColor must be a valid hex color").default("#FFFFFF"),
  textPosition: z.object({
    type: z.enum(TEXT_POSITION_TYPES),
    x: z.number().optional(),
    y: z.number().optional(),
  }).default({ type: "center" }),
});

export async function POST(request: Request) {
  let workspaceId: string | undefined;
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    workspaceId = workspace.id;

    let body: z.infer<typeof compositeSchema>;
    try {
      body = compositeSchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid request body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { backgroundImageUrl, text, fontFamily, fontSize, textColor, textPosition } = body;

    if (!isPublicUrl(backgroundImageUrl)) {
      return NextResponse.json(
        { error: "backgroundImageUrl must be a public HTTPS URL" },
        { status: 400 }
      );
    }

    // Fetch background image
    const bgResponse = await fetch(backgroundImageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!bgResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch background image" },
        { status: 400 }
      );
    }
    const bgBuffer = Buffer.from(await bgResponse.arrayBuffer());

    // Composite
    const { buffer, width, height } = await compositeTextOnImage({
      backgroundBuffer: bgBuffer,
      text,
      fontFamily,
      fontSize,
      textColor,
      textPosition,
    });

    // Upload
    const fileName = `preview-${Date.now()}.png`;
    const uploadResult = await uploadAdImage(workspace.id, buffer, fileName);
    if ("error" in uploadResult) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: uploadResult.url,
      storagePath: uploadResult.path,
      width,
      height,
    });
  } catch (err) {
    console.error("[composite] Error:", { workspace_id: workspaceId, error: err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
