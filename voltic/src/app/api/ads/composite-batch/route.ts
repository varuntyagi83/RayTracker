import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { compositeTextOnImage } from "@/lib/compositing/text-overlay";
import { uploadAdImage } from "@/lib/data/ads";
import type { TextPosition } from "@/types/ads";

export const maxDuration = 300;

interface CombinationInput {
  combinationId: string;
  backgroundImageUrl: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
}

export async function POST(request: Request) {
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { combinations } = (await request.json()) as {
      combinations: CombinationInput[];
    };

    if (!combinations?.length) {
      return NextResponse.json(
        { error: "combinations array is required" },
        { status: 400 }
      );
    }

    // Deduplicate and pre-fetch unique background images
    const uniqueUrls = [...new Set(combinations.map((c) => c.backgroundImageUrl))];
    const bgBufferMap = new Map<string, Buffer>();

    await Promise.all(
      uniqueUrls.map(async (url) => {
        const res = await fetch(url);
        if (res.ok) {
          bgBufferMap.set(url, Buffer.from(await res.arrayBuffer()));
        }
      })
    );

    // Process combinations with limited concurrency
    const CONCURRENCY = 5;
    const results: Array<{
      combinationId: string;
      imageUrl: string;
      storagePath: string;
      width: number;
      height: number;
    }> = [];
    const errors: Array<{ combinationId: string; error: string }> = [];

    for (let i = 0; i < combinations.length; i += CONCURRENCY) {
      const batch = combinations.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (combo) => {
          const bgBuffer = bgBufferMap.get(combo.backgroundImageUrl);
          if (!bgBuffer) throw new Error("Background not available");

          const { buffer, width, height } = await compositeTextOnImage({
            backgroundBuffer: bgBuffer,
            text: combo.text,
            fontFamily: combo.fontFamily ?? "Inter",
            fontSize: combo.fontSize ?? 48,
            textColor: combo.textColor ?? "#FFFFFF",
            textPosition: combo.textPosition ?? { type: "center" },
          });

          const fileName = `ad-${combo.combinationId}-${Date.now()}.png`;
          const uploadResult = await uploadAdImage(workspace.id, buffer, fileName);
          if ("error" in uploadResult) throw new Error(uploadResult.error);

          return {
            combinationId: combo.combinationId,
            imageUrl: uploadResult.url,
            storagePath: uploadResult.path,
            width,
            height,
          };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const br = batchResults[j];
        if (br.status === "fulfilled") {
          results.push(br.value);
        } else {
          errors.push({
            combinationId: batch[j].combinationId,
            error: br.reason?.message ?? "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({ results, errors });
  } catch (err) {
    console.error("Batch composite error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
