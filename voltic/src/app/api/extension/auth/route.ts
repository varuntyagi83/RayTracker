import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { validateExtensionToken } from "@/lib/extension/auth";
import { trackServer } from "@/lib/analytics/posthog-server";
import { authLimiter } from "@/lib/utils/rate-limit";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  // Rate limit by token
  const rl = await authLimiter.check(tokenKey, 10);
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

  // Fetch workspace info
  const workspace = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, auth.workspaceId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 }
    );
  }

  trackServer("extension_auth_validated", auth.userId ?? "unknown", {
    workspace_id: auth.workspaceId!,
  });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
  });
}
