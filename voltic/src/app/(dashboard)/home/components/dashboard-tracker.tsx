"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/events";

export function DashboardTracker({ adAccountCount }: { adAccountCount: number }) {
  useEffect(() => {
    track("dashboard_loaded", { ad_account_count: adAccountCount });
  }, [adAccountCount]);

  return null;
}
