import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeAutomation } from "@/lib/automations/executor";
import { trackServer } from "@/lib/analytics/posthog-server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify automation exists and belongs to user's workspace
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  const { data: automation } = await admin
    .from("automations")
    .select("workspace_id")
    .eq("id", automationId)
    .single();

  if (!automation || automation.workspace_id !== member.workspace_id) {
    return NextResponse.json(
      { error: "Automation not found" },
      { status: 404 }
    );
  }

  // Execute as test run
  const result = await executeAutomation(automationId, true);

  trackServer("automation_test_run", user.id, {
    automation_id: automationId,
    success: result.success,
  });

  return NextResponse.json(result);
}
