import { db } from "@/lib/db";
import { automations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Automation } from "@/types/automation";

export async function getAutomations(
  workspaceId: string
): Promise<Automation[]> {
  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.workspaceId, workspaceId))
    .orderBy(desc(automations.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    workspace_id: r.workspaceId,
    name: r.name,
    description: r.description ?? null,
    type: r.type as Automation["type"],
    status: r.status as Automation["status"],
    config: r.config as Automation["config"],
    schedule: r.schedule as Automation["schedule"],
    delivery: r.delivery as Automation["delivery"],
    classification: r.classification as Automation["classification"],
    last_run_at: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));
}

export async function getAutomation(
  workspaceId: string,
  automationId: string
): Promise<Automation | null> {
  const [row] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspaceId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    workspace_id: row.workspaceId,
    name: row.name,
    description: row.description ?? null,
    type: row.type as Automation["type"],
    status: row.status as Automation["status"],
    config: row.config as Automation["config"],
    schedule: row.schedule as Automation["schedule"],
    delivery: row.delivery as Automation["delivery"],
    classification: row.classification as Automation["classification"],
    last_run_at: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
