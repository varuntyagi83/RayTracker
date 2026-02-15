import { NextRequest, NextResponse } from "next/server";
import { validateExtensionToken } from "@/lib/extension/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
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
