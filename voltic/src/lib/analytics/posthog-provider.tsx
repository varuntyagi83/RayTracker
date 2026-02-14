"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false, // We capture manually below
    capture_pageleave: true,
  });
}

function PostHogPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      ph.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

// Helper to identify user and group by workspace
export function identifyUser(
  userId: string,
  properties: { email?: string; name?: string }
) {
  if (typeof window !== "undefined") {
    posthog.identify(userId, properties);
  }
}

export function groupByWorkspace(
  workspaceId: string,
  properties: { name?: string }
) {
  if (typeof window !== "undefined") {
    posthog.group("workspace", workspaceId, properties);
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined") {
    posthog.capture(eventName, properties);
  }
}

export function resetPostHog() {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
}

// Re-export typed track from events module for convenience
export { track } from "./events";
