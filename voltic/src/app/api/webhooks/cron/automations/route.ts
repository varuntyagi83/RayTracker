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

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find all active automations
  const { data: automations, error } = await admin
    .from("automations")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    // eslint-disable-next-line no-console
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
      const result = await executeAutomation(a.id);
      return { id: a.id, name: a.name, ...result };
    })
  );

  const summary = results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    return { error: r.reason?.message ?? "Unknown error" };
  });

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

  // Resolve current time in the automation's configured timezone
  const tzNow = new Date(
    now.toLocaleString("en-US", { timeZone: schedule.timezone || "UTC" })
  );

  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ] as const;
  const currentDay = dayNames[tzNow.getDay()];

  // Daily automations run every day; weekly only on configured days
  if (schedule.frequency === "weekly" && !schedule.days.includes(currentDay)) {
    return false;
  }
  if (
    schedule.frequency === "daily" &&
    schedule.days.length > 0 &&
    !schedule.days.includes(currentDay)
  ) {
    return false;
  }

  // ±10-minute window absorbs Vercel Cron jitter — cron fires every 5 min,
  // so any scheduled time is always within 10 minutes of a firing.
  // Double-firing is prevented by the 55-minute idempotency guard below.
  const [scheduleHour, scheduleMinute] = schedule.time.split(":").map(Number);
  const scheduleMinutes = scheduleHour * 60 + scheduleMinute;
  const currentMinutes = tzNow.getHours() * 60 + tzNow.getMinutes();
  const diff = Math.abs(currentMinutes - scheduleMinutes);

  if (diff > 10) return false;

  // Idempotency guard: skip if already run within the last 55 minutes.
  // This prevents double-execution when the wider window catches two cron firings.
  if (automation.last_run_at) {
    const lastRun = new Date(automation.last_run_at);
    const minsSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
    if (minsSinceLastRun < 55) return false;
  }

  return true;
}
