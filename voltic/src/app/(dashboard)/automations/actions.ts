"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { db } from "@/lib/db";
import { automations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const parsed = automationSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [data] = await db
    .insert(automations)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      status: parsed.data.status,
      config: parsed.data.config,
      schedule: parsed.data.schedule,
      delivery: parsed.data.delivery,
      classification: parsed.data.classification ?? null,
    })
    .returning();

  if (!data) return { error: "Failed to create automation" };

  revalidatePath("/automations");
  return { data, error: null };
}

export async function updateAutomation(
  automationId: string,
  updates: Partial<z.infer<typeof automationSchema>>
) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const updateValues: Record<string, unknown> = {};
  if (updates.name !== undefined) updateValues.name = updates.name;
  if (updates.description !== undefined) updateValues.description = updates.description;
  if (updates.type !== undefined) updateValues.type = updates.type;
  if (updates.status !== undefined) updateValues.status = updates.status;
  if (updates.config !== undefined) updateValues.config = updates.config;
  if (updates.schedule !== undefined) updateValues.schedule = updates.schedule;
  if (updates.delivery !== undefined) updateValues.delivery = updates.delivery;
  if (updates.classification !== undefined) updateValues.classification = updates.classification;

  const [data] = await db
    .update(automations)
    .set(updateValues)
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspace.id)))
    .returning();

  if (!data) return { error: "Automation not found or update failed" };

  revalidatePath("/automations");
  return { data, error: null };
}

export async function toggleAutomationStatus(automationId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const [current] = await db
    .select({ status: automations.status })
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspace.id)));

  if (!current) return { error: "Not found" };

  const newStatus = current.status === "active" ? "paused" : "active";

  // Optimistic lock: also match current status so two concurrent toggles
  // don't both flip — the second will get 0 rows and return a safe error.
  const [updated] = await db
    .update(automations)
    .set({ status: newStatus })
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.workspaceId, workspace.id),
        eq(automations.status, current.status)
      )
    )
    .returning({ status: automations.status });

  if (!updated) {
    return { error: "Status changed concurrently — please refresh." };
  }

  revalidatePath("/automations");
  return { status: updated.status, error: null };
}
