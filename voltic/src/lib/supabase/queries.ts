import { createClient } from "./server";
import type { Workspace } from "@/lib/hooks/use-workspace";

export async function getWorkspace(): Promise<Workspace | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the user's workspace via workspace_members
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, timezone, currency, credit_balance, settings")
    .eq("id", member.workspace_id)
    .single();

  return workspace as Workspace | null;
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
