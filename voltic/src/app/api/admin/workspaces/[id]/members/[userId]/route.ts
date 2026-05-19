import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/admin";
import { z } from "zod";

type Params = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId: callerId } = await auth();
  if (!callerId || !isSuperAdmin(callerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId, userId: targetUserId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [updated] = await db
    .update(workspaceMembers)
    .set({ role: parsed.data.role })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId)
      )
    )
    .returning({ id: workspaceMembers.id, role: workspaceMembers.role });

  if (!updated) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ id: updated.id, role: updated.role });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: callerId } = await auth();
  if (!callerId || !isSuperAdmin(callerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId, userId: targetUserId } = await params;

  const [deleted] = await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId)
      )
    )
    .returning({ id: workspaceMembers.id });

  if (!deleted) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
