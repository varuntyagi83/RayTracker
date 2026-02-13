import { createAdminClient } from "@/lib/supabase/admin";
import type { Automation } from "@/types/automation";

export async function getAutomations(
  workspaceId: string
): Promise<Automation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data as Automation[];
}

export async function getAutomation(
  automationId: string
): Promise<Automation | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (error || !data) return null;

  return data as Automation;
}
