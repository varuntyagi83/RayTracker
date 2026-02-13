"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createWorkspace(workspaceName: string) {
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

  const slug = workspaceName
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
