import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaces } from "@/lib/supabase/queries";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await req.json();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const all = await getWorkspaces();
  const target = all.find((w) => w.id === workspaceId);
  if (!target) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("voltic-active-workspace", workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
