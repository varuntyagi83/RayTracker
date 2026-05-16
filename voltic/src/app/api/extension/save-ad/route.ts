import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { validateExtensionToken } from "@/lib/extension/auth";
import { db } from "@/lib/db";
import { boards, savedAds } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { trackServer } from "@/lib/analytics/posthog-server";
import { authLimiter } from "@/lib/utils/rate-limit";

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

  // Hash token to reduce memory footprint in rate-limit key store (L-10)
  const tokenKey = crypto.createHash("sha256").update(token).digest("hex");

  // Rate limit by token (H-30)
  const rl = await authLimiter.check(tokenKey, 30);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  // Verify board belongs to this workspace
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, body.boardId), eq(boards.workspaceId, auth.workspaceId)))
    .limit(1);

  if (!board) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404 }
    );
  }

  // Duplicate check: skip if same meta_library_id already in this board
  if (body.ad.metaLibraryId) {
    const existing = await db
      .select({ id: savedAds.id })
      .from(savedAds)
      .where(
        and(
          eq(savedAds.boardId, body.boardId),
          eq(savedAds.metaLibraryId, body.ad.metaLibraryId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      trackServer("extension_ad_saved", auth.userId ?? "unknown", {
        workspace_id: auth.workspaceId,
        board_id: body.boardId,
        duplicate: true,
      });
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Ad already saved to this board",
      });
    }
  }

  // Insert the ad
  try {
    await db.insert(savedAds).values({
      boardId: body.boardId,
      workspaceId: auth.workspaceId,
      source: "extension",
      metaLibraryId: body.ad.metaLibraryId ?? null,
      brandName: body.ad.brandName ?? null,
      headline: body.ad.headline ?? null,
      body: body.ad.body ?? null,
      format: body.ad.format,
      imageUrl: body.ad.imageUrl ?? null,
      landingPageUrl: body.ad.landingPageUrl ?? null,
      platforms: body.ad.platforms ?? null,
      startDate: body.ad.startDate ?? null,
      runtimeDays: body.ad.runtimeDays ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save ad" },
      { status: 500 }
    );
  }

  trackServer("extension_ad_saved", auth.userId ?? "unknown", {
    workspace_id: auth.workspaceId,
    board_id: body.boardId,
    duplicate: false,
  });

  return NextResponse.json({ success: true });
}
