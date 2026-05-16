import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { validateExtensionToken } from "@/lib/extension/auth";
import { db } from "@/lib/db";
import { boards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authLimiter } from "@/lib/utils/rate-limit";

export async function GET(req: NextRequest) {
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
  const rl = await authLimiter.check(tokenKey, 20);
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

  const rows = await db
    .select({ id: boards.id, name: boards.name })
    .from(boards)
    .where(eq(boards.workspaceId, auth.workspaceId))
    .orderBy(boards.name)
    .limit(50);

  return NextResponse.json({
    boards: rows.map((b) => ({ id: b.id, name: b.name })),
  });
}
