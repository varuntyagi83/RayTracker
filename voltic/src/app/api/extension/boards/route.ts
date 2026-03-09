import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { validateExtensionToken } from "@/lib/extension/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();
  const { data: boards } = await supabase
    .from("boards")
    .select("id, name")
    .eq("workspace_id", auth.workspaceId)
    .order("name")
    .limit(50);

  return NextResponse.json({
    boards: (boards ?? []).map((b) => ({ id: b.id, name: b.name })),
  });
}
