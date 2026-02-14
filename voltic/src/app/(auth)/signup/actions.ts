"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required").max(100).trim(),
  userId: z.string().uuid("Invalid user ID"),
});

export async function createWorkspace(workspaceName: string, userId: string) {
  const parsed = createWorkspaceSchema.safeParse({ workspaceName, userId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use admin client for DB writes (bypasses RLS)
  const admin = createAdminClient();

  // Verify the user actually exists in Supabase Auth
  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(parsed.data.userId);
  if (authError || !authUser?.user) {
    return { error: "Not authenticated" };
  }

  const user = authUser.user;

  const slug = parsed.data.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({ name: workspaceName, slug })
    .select()
    .single();

  if (wsError) {
    return { error: wsError.message };
  }

  const { error: memberError } = await admin
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return { error: memberError.message };
  }

  return { error: null };
}
