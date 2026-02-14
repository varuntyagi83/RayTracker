import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildCommentDigest } from "./comment-digest";
import type {
  CommentFetchResult,
  PageComment,
} from "@/lib/meta/comments";

const NOW = new Date("2026-02-14T12:00:00Z").getTime();

const makeComment = (overrides: Partial<PageComment> = {}): PageComment => ({
  id: "c1",
  pageId: "p1",
  pageName: "My Brand",
  platform: "facebook",
  postId: "post_1",
  postTitle: "Summer Launch",
  commenterId: "user_1",
  commenterName: "John Doe",
  text: "Love this product!",
  sentiment: "positive",
  createdAt: new Date(NOW - 5 * 60 * 1000).toISOString(), // 5 min ago
  permalink: null,
  ...overrides,
});

const baseResult: CommentFetchResult = {
  comments: [makeComment()],
  totalCount: 1,
  fetchedAt: new Date(NOW).toISOString(),
  pageBreakdown: [{ pageId: "p1", pageName: "My Brand", count: 1 }],
};

describe("buildCommentDigest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes test run prefix when isTestRun is true", () => {
    const msg = buildCommentDigest(baseResult, "Monitor", "#c", true);
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toContain(":test_tube: TEST RUN");
  });

  it("does not include test run prefix by default", () => {
    const msg = buildCommentDigest(baseResult, "Monitor", "#c");
    const headerText = (msg.blocks[0].text as { text: string }).text;
    expect(headerText).toBe("Monitor");
  });

  it("groups comments by page", () => {
    const blockTexts = JSON.stringify(
      buildCommentDigest(baseResult, "T", "#c").blocks
    );
    expect(blockTexts).toContain("My Brand");
    expect(blockTexts).toContain("1 comments");
  });

  it("caps comments at 10 per page", () => {
    const comments = Array.from({ length: 20 }, (_, i) =>
      makeComment({ id: `c${i}`, text: `Comment ${i}` })
    );
    const data: CommentFetchResult = {
      ...baseResult,
      comments,
      totalCount: 20,
      pageBreakdown: [{ pageId: "p1", pageName: "My Brand", count: 20 }],
    };
    const msg = buildCommentDigest(data, "T", "#c");
    const commentBlocks = msg.blocks.filter(
      (b) =>
        b.type === "section" &&
        typeof b.text === "object" &&
        b.text !== null &&
        "text" in b.text &&
        (b.text as { text: string }).text.includes("John Doe")
    );
    expect(commentBlocks.length).toBeLessThanOrEqual(10);
  });

  it("formats timeAgo for minutes", () => {
    const blockTexts = JSON.stringify(
      buildCommentDigest(baseResult, "T", "#c").blocks
    );
    expect(blockTexts).toContain("5m ago");
  });

  it("formats timeAgo for hours", () => {
    const data: CommentFetchResult = {
      ...baseResult,
      comments: [
        makeComment({
          createdAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(),
        }),
      ],
    };
    const blockTexts = JSON.stringify(
      buildCommentDigest(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain("3h ago");
  });

  it("formats timeAgo for days", () => {
    const data: CommentFetchResult = {
      ...baseResult,
      comments: [
        makeComment({
          createdAt: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ],
    };
    const blockTexts = JSON.stringify(
      buildCommentDigest(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain("2d ago");
  });

  it("calculates sentiment counts correctly", () => {
    const comments = [
      makeComment({ id: "c1", sentiment: "positive" }),
      makeComment({ id: "c2", sentiment: "positive" }),
      makeComment({ id: "c3", sentiment: "negative" }),
      makeComment({ id: "c4", sentiment: "neutral" }),
      makeComment({ id: "c5", sentiment: "question" }),
    ];
    const data: CommentFetchResult = {
      ...baseResult,
      comments,
      totalCount: 5,
    };
    const blockTexts = JSON.stringify(
      buildCommentDigest(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain("2 positive");
    expect(blockTexts).toContain("1 negative");
    expect(blockTexts).toContain("1 neutral");
    expect(blockTexts).toContain("1 questions");
  });

  it("truncates long comment text at 200 chars", () => {
    const data: CommentFetchResult = {
      ...baseResult,
      comments: [makeComment({ text: "A".repeat(250) })],
    };
    const blockTexts = JSON.stringify(
      buildCommentDigest(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain("A".repeat(197) + "...");
  });

  it("includes platform emojis", () => {
    const comments = [
      makeComment({ id: "c1", platform: "facebook" }),
      makeComment({ id: "c2", platform: "instagram" }),
    ];
    const data: CommentFetchResult = {
      ...baseResult,
      comments,
      totalCount: 2,
    };
    const blockTexts = JSON.stringify(
      buildCommentDigest(data, "T", "#c").blocks
    );
    expect(blockTexts).toContain(":facebook:");
    expect(blockTexts).toContain(":instagram:");
  });
});
