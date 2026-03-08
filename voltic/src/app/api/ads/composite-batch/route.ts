import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { compositeTextOnImage } from "@/lib/compositing/text-overlay";
import { uploadAdImage } from "@/lib/data/ads";

export const maxDuration = 300;

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

const combinationSchema = z.object({
  combinationId: z.string().min(1).max(100),
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

const batchSchema = z.object({
  combinations: z.array(combinationSchema).min(1).max(50),
});

export async function POST(request: Request) {
  let workspaceId: string | undefined;
  try {
    const workspace = await getWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    workspaceId = workspace.id;

    let combinations: z.infer<typeof combinationSchema>[];
    try {
      ({ combinations } = batchSchema.parse(await request.json()));
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid request body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Validate all URLs before fetching (SSRF guard)
    const invalidUrl = combinations.find((c) => !isPublicUrl(c.backgroundImageUrl));
    if (invalidUrl) {
      return NextResponse.json(
        { error: "backgroundImageUrl must be a public HTTPS URL" },
        { status: 400 }
      );
    }

    // Deduplicate and pre-fetch unique background images
    const uniqueUrls = [...new Set(combinations.map((c) => c.backgroundImageUrl))];
    const bgBufferMap = new Map<string, Buffer>();

    await Promise.all(
      uniqueUrls.map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
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
            fontFamily: combo.fontFamily,
            fontSize: combo.fontSize,
            textColor: combo.textColor,
            textPosition: combo.textPosition,
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
    console.error("[composite-batch] Error:", { workspace_id: workspaceId, error: err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
