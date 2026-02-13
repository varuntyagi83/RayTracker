/**
 * Slack Web API Client
 *
 * Sends messages to Slack channels using incoming webhooks or the Web API.
 * Uses SLACK_BOT_TOKEN for authenticated API calls.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean } | string;
  elements?: Record<string, any>[];
  fields?: { type: string; text: string }[];
  accessory?: SlackBlock;
  block_id?: string;
  image_url?: string;
  alt_text?: string;
  url?: string;
  action_id?: string;
}

export interface SlackMessage {
  channel: string;
  text: string; // fallback text
  blocks: SlackBlock[];
  unfurl_links?: boolean;
}

/**
 * Send a Slack message via the Web API.
 * Falls back to logging if SLACK_BOT_TOKEN is not configured.
 */
export async function sendSlackMessage(message: SlackMessage): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    console.warn("[slack] SLACK_BOT_TOKEN not set — logging message instead");
    console.log("[slack] Would send to", message.channel, ":", message.text);
    return { ok: true };
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("[slack] API error:", result.error);
      return { ok: false, error: result.error };
    }

    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[slack] Send failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Block Builder Helpers ──────────────────────────────────────────────────

export function headerBlock(text: string): SlackBlock {
  return { type: "header", text: { type: "plain_text", text, emoji: true } };
}

export function sectionBlock(text: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text } };
}

export function fieldsBlock(fields: string[]): SlackBlock {
  return {
    type: "section",
    fields: fields.map((f) => ({ type: "mrkdwn", text: f })),
  };
}

export function dividerBlock(): SlackBlock {
  return { type: "divider" };
}

export function contextBlock(text: string): SlackBlock {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text }],
  };
}

export function buttonBlock(text: string, url: string, actionId: string): SlackBlock {
  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text, emoji: true },
        url,
        action_id: actionId,
      },
    ],
  };
}
