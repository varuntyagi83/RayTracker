import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { compositeTextOnImage } from "@/lib/compositing/text-overlay";
import { uploadAdImage } from "@/lib/data/ads";
import type { TextPosition } from "@/types/ads";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      backgroundImageUrl,
      text,
      fontFamily,
      fontSize,
      textColor,
      textPosition,
    } = body as {
      backgroundImageUrl: string;
      text: string;
      fontFamily: string;
      fontSize: number;
      textColor: string;
      textPosition: TextPosition;
    };

    if (!backgroundImageUrl || !text) {
      return NextResponse.json(
        { error: "backgroundImageUrl and text are required" },
        { status: 400 }
      );
    }

    // Fetch background image
    const bgResponse = await fetch(backgroundImageUrl);
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
      fontFamily: fontFamily ?? "Inter",
      fontSize: fontSize ?? 48,
      textColor: textColor ?? "#FFFFFF",
      textPosition: textPosition ?? { type: "center" },
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
    console.error("Composite error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
