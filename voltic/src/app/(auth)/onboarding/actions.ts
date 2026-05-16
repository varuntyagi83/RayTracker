"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required").max(100).trim(),
});

export async function createWorkspace(workspaceName: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const parsed = schema.safeParse({ workspaceName });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [existingMember] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (existingMember) {
    return { error: null };
  }

  const slug = parsed.data.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [newWorkspace] = await db
    .insert(workspaces)
    .values({ name: parsed.data.workspaceName, slug })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: newWorkspace.id,
    userId,
    role: "owner",
  });

  return { error: null };
}
