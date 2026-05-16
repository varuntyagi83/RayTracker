import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeAutomation } from "@/lib/automations/executor";
import { trackServer } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import { workspaceMembers, automations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Test Run Endpoint
 *
 * POST /api/automations/{id}/test-run
 *
 * Executes an automation immediately with the "TEST RUN" prefix.
 * Requires authentication. Records the run in automation_runs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: automationId } = await params;

  // Verify auth
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify automation exists and belongs to user's workspace
  const member = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  const automation = await db
    .select({ workspaceId: automations.workspaceId })
    .from(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.workspaceId, member.workspaceId)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!automation) {
    return NextResponse.json(
      { error: "Automation not found" },
      { status: 404 }
    );
  }

  // Execute as test run
  const result = await executeAutomation(automationId, true);

  trackServer("automation_test_run", userId, {
    automation_id: automationId,
    success: result.success,
  });

  return NextResponse.json(result);
}
