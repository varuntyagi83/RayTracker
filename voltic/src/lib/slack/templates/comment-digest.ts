/**
 * Slack Template: Comment Digest
 *
 * Renders comments grouped by page, with individual comment details,
 * sentiment indicators, and platform icons.
 */

import type { SlackBlock, SlackMessage } from "@/lib/slack/client";
import {
  headerBlock,
  sectionBlock,
  dividerBlock,
  contextBlock,
} from "@/lib/slack/client";
import type { CommentFetchResult, PageComment } from "@/lib/meta/comments";

// ─── Helpers ────────────────────────────────────────────────────────────────

const SENTIMENT_EMOJI: Record<PageComment["sentiment"], string> = {
  positive: ":large_green_circle:",
  negative: ":red_circle:",
  neutral: ":white_circle:",
  question: ":question:",
};

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: ":facebook:",
  instagram: ":instagram:",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Template ───────────────────────────────────────────────────────────────

export function buildCommentDigest(
  data: CommentFetchResult,
  automationName: string,
  channel: string,
  isTestRun = false
): SlackMessage {
  const prefix = isTestRun ? ":test_tube: TEST RUN — " : "";
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push(
    headerBlock(`${prefix}${automationName}`)
  );
  blocks.push(
    contextBlock(
      `:speech_balloon: *${data.totalCount} new comments* across ${data.pageBreakdown.length} pages | ${formatTimestamp(data.fetchedAt)}`
    )
  );
  blocks.push(dividerBlock());

  // Group comments by page
  for (const page of data.pageBreakdown) {
    if (page.count === 0) continue;

    blocks.push(
      sectionBlock(`*${page.pageName}* — ${page.count} comments`)
    );

    const pageComments = data.comments
      .filter((c) => c.pageId === page.pageId)
      .slice(0, 10); // Cap per page to stay within Slack limits

    for (const comment of pageComments) {
      const platform = PLATFORM_EMOJI[comment.platform] || `:${comment.platform}:`;
      const sentiment = SENTIMENT_EMOJI[comment.sentiment] || "";

      blocks.push(
        sectionBlock(
          `${sentiment} ${platform} *${comment.commenterName}* on _${comment.postTitle}_\n` +
          `> ${truncate(comment.text, 200)}\n` +
          `_${timeAgo(comment.createdAt)}_`
        )
      );
    }

    blocks.push(dividerBlock());
  }

  // Summary
  const sentimentCounts = {
    positive: data.comments.filter((c) => c.sentiment === "positive").length,
    negative: data.comments.filter((c) => c.sentiment === "negative").length,
    neutral: data.comments.filter((c) => c.sentiment === "neutral").length,
    question: data.comments.filter((c) => c.sentiment === "question").length,
  };

  blocks.push(
    contextBlock(
      `:bar_chart: Sentiment: ` +
      `${SENTIMENT_EMOJI.positive} ${sentimentCounts.positive} positive | ` +
      `${SENTIMENT_EMOJI.negative} ${sentimentCounts.negative} negative | ` +
      `${SENTIMENT_EMOJI.neutral} ${sentimentCounts.neutral} neutral | ` +
      `${SENTIMENT_EMOJI.question} ${sentimentCounts.question} questions`
    )
  );

  blocks.push(
    contextBlock(`:zap: Powered by Voltic`)
  );

  return {
    channel,
    text: `${prefix}${automationName} — ${data.totalCount} new comments`,
    blocks,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
