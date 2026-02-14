import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeAutomation } from "@/lib/automations/executor";
import { trackServer } from "@/lib/analytics/posthog-server";
import type { Automation } from "@/types/automation";

/**
 * Cron Endpoint: Execute Due Automations
 *
 * Called by Vercel Cron (or external cron service) on a regular schedule.
 * Checks for active automations that are due based on their schedule,
 * then executes them.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find all active automations
  const { data: automations, error } = await admin
    .from("automations")
    .select("*")
    .eq("status", "active");

  if (error) {
    console.error("[cron] Failed to load automations:", error);
    trackServer("automation_cron_error", "system", {
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to load automations" },
      { status: 500 }
    );
  }

  if (!automations || automations.length === 0) {
    return NextResponse.json({ executed: 0, results: [] });
  }

  // Filter to automations that are due now
  const now = new Date();
  const dueAutomations = (automations as Automation[]).filter((a) =>
    isAutomationDue(a, now)
  );

  // Execute due automations
  const results = await Promise.allSettled(
    dueAutomations.map(async (a) => {
      console.log(`[cron] Executing automation: ${a.name} (${a.id})`);
      const result = await executeAutomation(a.id);
      return { id: a.id, name: a.name, ...result };
    })
  );

  const summary = results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    return { error: r.reason?.message ?? "Unknown error" };
  });

  console.log(
    `[cron] Executed ${dueAutomations.length}/${automations.length} automations`
  );

  trackServer("automation_cron_executed", "system", {
    total: automations.length,
    executed: dueAutomations.length,
  });

  return NextResponse.json({
    executed: dueAutomations.length,
    total: automations.length,
    results: summary,
  });
}

// ─── Schedule Checker ───────────────────────────────────────────────────────

function isAutomationDue(automation: Automation, now: Date): boolean {
  const schedule = automation.schedule;
  if (!schedule) return false;

  // Check day of week
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const currentDay = dayNames[now.getDay()];

  if (schedule.frequency === "weekly" && !schedule.days.includes(currentDay)) {
    return false;
  }

  // Check time (within a 15-minute window)
  const [scheduleHour, scheduleMinute] = schedule.time.split(":").map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const scheduleMinutes = scheduleHour * 60 + scheduleMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  const diff = Math.abs(currentMinutes - scheduleMinutes);

  if (diff > 15) return false;

  // Check if already run recently (within 1 hour to avoid duplicates)
  if (automation.last_run_at) {
    const lastRun = new Date(automation.last_run_at);
    const hoursSinceLastRun =
      (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun < 1) return false;
  }

  return true;
}
