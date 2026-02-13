"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/supabase/queries";

const automationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  type: z.enum(["performance", "competitor", "comments"]),
  status: z.enum(["draft", "active"]).default("draft"),
  config: z.record(z.string(), z.unknown()),
  schedule: z.record(z.string(), z.unknown()),
  delivery: z.record(z.string(), z.unknown()),
  classification: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function createAutomation(formData: z.infer<typeof automationSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = automationSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automations")
    .insert({
      workspace_id: workspace.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return { data, error: null };
}

export async function updateAutomation(
  automationId: string,
  updates: Partial<z.infer<typeof automationSchema>>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automations")
    .update(updates)
    .eq("id", automationId)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data, error: null };
}

export async function toggleAutomationStatus(automationId: string) {
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("automations")
    .select("status")
    .eq("id", automationId)
    .single();

  if (!current) return { error: "Not found" };

  const newStatus = current.status === "active" ? "paused" : "active";
  const { error } = await admin
    .from("automations")
    .update({ status: newStatus })
    .eq("id", automationId);

  if (error) return { error: error.message };

  return { status: newStatus, error: null };
}
