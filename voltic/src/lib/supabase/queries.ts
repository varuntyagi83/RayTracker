import { createClient } from "./server";
import { createAdminClient } from "./admin";
import type { Workspace } from "@/lib/hooks/use-workspace";

export async function getWorkspace(): Promise<Workspace | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use admin client to bypass RLS until migration policies are applied
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name, slug, timezone, currency, credit_balance, settings, meta_access_token")
    .eq("id", member.workspace_id)
    .single();

  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    timezone: workspace.timezone,
    currency: workspace.currency,
    credit_balance: workspace.credit_balance,
    settings: workspace.settings as Record<string, unknown>,
    meta_connected: !!workspace.meta_access_token,
  };
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
