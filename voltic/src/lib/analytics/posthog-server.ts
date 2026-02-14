import { PostHog } from "posthog-node";
import type { VolticEvent, EventPropertiesMap } from "./events";

let client: PostHog | null = null;

function getServerPostHog(): PostHog {
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Type-safe server-side event tracking.
 * Uses posthog-node for API routes, cron jobs, and background tasks.
 */
export function trackServer<E extends VolticEvent>(
  event: E,
  distinctId: string,
  properties: EventPropertiesMap[E]
): void {
  try {
    getServerPostHog().capture({
      distinctId,
      event,
      properties: properties as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[posthog-server] Failed to capture event:", event, err);
  }
}
