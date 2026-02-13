/**
 * Meta Comments Service
 *
 * Fetches comments from Facebook Pages and Instagram accounts.
 * Uses Meta Graph API v21.0 in production.
 * Falls back to mock data when access tokens are not configured.
 */

export interface PageComment {
  id: string;
  pageId: string;
  pageName: string;
  platform: "facebook" | "instagram";
  postId: string;
  postTitle: string;
  commenterId: string;
  commenterName: string;
  text: string;
  sentiment: "positive" | "negative" | "neutral" | "question";
  createdAt: string;
  permalink: string | null;
}

export interface CommentFetchParams {
  pages: { pageId: string; pageName: string; accessToken?: string | null }[];
  postType: "organic" | "ad" | "all";
  postAge: "last_24h" | "last_7d" | "last_30d" | "all_time";
}

export interface CommentFetchResult {
  comments: PageComment[];
  totalCount: number;
  fetchedAt: string;
  pageBreakdown: { pageId: string; pageName: string; count: number }[];
}

/**
 * Fetch comments from monitored pages.
 *
 * TODO: Replace with real Meta Graph API integration in Phase 8+.
 * The real implementation will:
 * 1. For each page, call GET /{page_id}/feed to get posts
 * 2. Filter by post type (organic/ad) and age
 * 3. For each post, call GET /{post_id}/comments
 * 4. Run basic sentiment analysis on comment text
 * 5. Return aggregated results
 */
export async function fetchPageComments(
  params: CommentFetchParams
): Promise<CommentFetchResult> {
  // Mock implementation — returns sample data for UI development
  const allComments: PageComment[] = [];

  for (const page of params.pages) {
    const pageComments = MOCK_COMMENTS_PER_PAGE.map((c, i) => ({
      ...c,
      id: `comment_${crypto.randomUUID().slice(0, 8)}`,
      pageId: page.pageId,
      pageName: page.pageName,
      createdAt: getRandomCommentDate(params.postAge),
    }));
    allComments.push(...pageComments.slice(0, 5));
  }

  const pageBreakdown = params.pages.map((page) => ({
    pageId: page.pageId,
    pageName: page.pageName,
    count: allComments.filter((c) => c.pageId === page.pageId).length,
  }));

  return {
    comments: allComments,
    totalCount: allComments.length,
    fetchedAt: new Date().toISOString(),
    pageBreakdown,
  };
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_COMMENTS_PER_PAGE: Omit<PageComment, "id" | "pageId" | "pageName" | "createdAt">[] = [
  {
    platform: "facebook",
    postId: "post_001",
    postTitle: "Summer Collection Drop",
    commenterId: "user_001",
    commenterName: "Sarah Johnson",
    text: "Love these new shoes! Just ordered a pair. Can't wait for them to arrive!",
    sentiment: "positive",
    permalink: null,
  },
  {
    platform: "instagram",
    postId: "post_002",
    postTitle: "New Product Launch",
    commenterId: "user_002",
    commenterName: "Mike Rodriguez",
    text: "When will the blue colorway be available?",
    sentiment: "question",
    permalink: null,
  },
  {
    platform: "facebook",
    postId: "post_003",
    postTitle: "Training Gear Sale",
    commenterId: "user_003",
    commenterName: "Alex Park",
    text: "The sizing runs a bit small. I'd recommend ordering a size up.",
    sentiment: "neutral",
    permalink: null,
  },
  {
    platform: "instagram",
    postId: "post_004",
    postTitle: "Behind the Scenes",
    commenterId: "user_004",
    commenterName: "Jamie Lee",
    text: "Quality has gone downhill lately. Very disappointed with my last order.",
    sentiment: "negative",
    permalink: null,
  },
  {
    platform: "facebook",
    postId: "post_005",
    postTitle: "Customer Spotlight",
    commenterId: "user_005",
    commenterName: "Taylor Swift Fan",
    text: "Best brand ever! Been a loyal customer for 5 years now.",
    sentiment: "positive",
    permalink: null,
  },
];

function getRandomCommentDate(postAge: CommentFetchParams["postAge"]): string {
  const now = Date.now();
  const ranges: Record<typeof postAge, number> = {
    last_24h: 24 * 60 * 60 * 1000,
    last_7d: 7 * 24 * 60 * 60 * 1000,
    last_30d: 30 * 24 * 60 * 60 * 1000,
    all_time: 365 * 24 * 60 * 60 * 1000,
  };
  const offset = Math.floor(Math.random() * ranges[postAge]);
  return new Date(now - offset).toISOString();
}
