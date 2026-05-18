"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required").max(100).trim(),
});

export async function createWorkspace(workspaceName: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Not authenticated" };
  }

  const parsed = createWorkspaceSchema.safeParse({ workspaceName });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if user already has a workspace (prevent duplicates on retry)
  const existingMember = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existingMember) {
    return { error: null };
  }

  const slug = parsed.data.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let newWorkspace: typeof workspaces.$inferSelect;
  try {
    const inserted = await db
      .insert(workspaces)
      .values({ name: workspaceName, slug })
      .returning();
    newWorkspace = inserted[0];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace";
    return { error: message };
  }

  try {
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId,
      role: "owner",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace member";
    return { error: message };
  }

  return { error: null };
}
