"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required").max(100).trim(),
});

export async function createWorkspace(workspaceName: string) {
  const parsed = createWorkspaceSchema.safeParse({ workspaceName });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use regular client to verify auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Use admin client for DB writes (bypasses RLS)
  const admin = createAdminClient();

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
