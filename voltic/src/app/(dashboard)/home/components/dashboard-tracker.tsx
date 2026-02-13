"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/posthog-provider";

export function DashboardTracker({ adAccountCount }: { adAccountCount: number }) {
  useEffect(() => {
    trackEvent("dashboard_loaded", { ad_account_count: adAccountCount });
  }, [adAccountCount]);

  return null;
}
