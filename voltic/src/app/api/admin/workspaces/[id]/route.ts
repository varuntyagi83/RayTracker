import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/admin";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  creditBalance: z.number().int().min(0).max(10_000_000),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [updated] = await db
    .update(workspaces)
    .set({ creditBalance: parsed.data.creditBalance })
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id, creditBalance: workspaces.creditBalance });

  if (!updated) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ id: updated.id, creditBalance: updated.creditBalance });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;

  const [deleted] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });

  if (!deleted) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
