"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required").max(100).trim(),
  userId: z.string().uuid("Invalid user ID"),
});

export async function createWorkspace(workspaceName: string, userId: string) {
  const parsed = createWorkspaceSchema.safeParse({ workspaceName, userId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use admin client for auth calls only (bypasses RLS)
  const admin = createAdminClient();

  // Verify the user actually exists in Supabase Auth
  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(parsed.data.userId);
  if (authError || !authUser?.user) {
    return { error: "Not authenticated" };
  }

  const user = authUser.user;

  // Check if user already has a workspace (prevent duplicates on retry)
  const existingMember = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existingMember) {
    // User already has a workspace — just succeed silently
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
      userId: user.id,
      role: "owner",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace member";
    return { error: message };
  }

  return { error: null };
}
