import { NextRequest, NextResponse } from "next/server";
import { validateExtensionToken } from "@/lib/extension/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackServer } from "@/lib/analytics/posthog-server";
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

  // Rate limit by token
  const rl = authLimiter.check(token, 10);
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
  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("id", auth.workspaceId)
    .single();

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
