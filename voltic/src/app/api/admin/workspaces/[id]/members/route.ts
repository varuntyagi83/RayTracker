import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/admin";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;

  const rows = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt);

  // Enrich with Clerk user profiles in a single batch call.
  let nameMap: Record<string, { name: string; email: string }> = {};
  if (rows.length > 0) {
    try {
      const client = await clerkClient();
      const { data: clerkUsers } = await client.users.getUserList({
        userId: rows.map((r) => r.userId),
        limit: 100,
      });
      for (const u of clerkUsers) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
          || u.username
          || "";
        const email = u.emailAddresses[0]?.emailAddress ?? "";
        nameMap[u.id] = { name, email };
      }
    } catch {
      // Non-fatal: fall back to showing the raw user ID
    }
  }

  const members = rows.map((r) => ({
    ...r,
    name: nameMap[r.userId]?.name ?? "",
    email: nameMap[r.userId]?.email ?? "",
  }));

  return NextResponse.json({ members });
}

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { userId: newUserId, role } = parsed.data;

  // Check for existing membership
  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, newUserId)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 409 });
  }

  const [inserted] = await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId: newUserId, role })
    .returning({ id: workspaceMembers.id });

  return NextResponse.json({ id: inserted.id, workspaceId, userId: newUserId, role });
}
