import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  decimal,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Tables ──────────────────────────────────────────────────────────────────

// Phase 1 tables (already exist in Supabase, defined here for Drizzle ORM usage)

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  creditBalance: integer("credit_balance").notNull().default(100),
  metaAccessToken: text("meta_access_token"),
  slackTeamId: text("slack_team_id"),
  slackAccessToken: text("slack_access_token"),
  slackTeamName: text("slack_team_name"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.userId
    ),
    index("idx_workspace_members_user_id").on(table.userId),
    index("idx_workspace_members_workspace_id").on(table.workspaceId),
  ]
);

// Phase 2 tables

export const adAccounts = pgTable(
  "ad_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    metaAccountId: text("meta_account_id").unique().notNull(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    timezone: text("timezone").notNull().default("UTC"),
    status: text("status").notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ad_accounts_workspace_id").on(table.workspaceId),
  ]
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    adAccountId: uuid("ad_account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    metaCampaignId: text("meta_campaign_id"),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    objective: text("objective"),
    dailyBudget: decimal("daily_budget", { precision: 12, scale: 2 }),
    lifetimeBudget: decimal("lifetime_budget", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_campaigns_workspace_id").on(table.workspaceId),
    index("idx_campaigns_ad_account_id").on(table.adAccountId),
  ]
);

export const campaignMetrics = pgTable(
  "campaign_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    spend: decimal("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    revenue: decimal("revenue", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    roas: decimal("roas", { precision: 8, scale: 4 }).notNull().default("0"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    ctr: decimal("ctr", { precision: 8, scale: 4 }).notNull().default("0"),
    purchases: integer("purchases").notNull().default(0),
    landingPageViews: integer("landing_page_views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_campaign_metrics_campaign_id").on(table.campaignId),
    index("idx_campaign_metrics_date").on(table.date),
  ]
);

export const creatives = pgTable(
  "creatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    metaCreativeId: text("meta_creative_id"),
    name: text("name").notNull(),
    headline: text("headline"),
    body: text("body"),
    landingPageUrl: text("landing_page_url"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    format: text("format").notNull().default("image"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_creatives_workspace_id").on(table.workspaceId),
    index("idx_creatives_campaign_id").on(table.campaignId),
  ]
);

export const creativeMetrics = pgTable(
  "creative_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    spend: decimal("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    revenue: decimal("revenue", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    roas: decimal("roas", { precision: 8, scale: 4 }).notNull().default("0"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    ctr: decimal("ctr", { precision: 8, scale: 4 }).notNull().default("0"),
    purchases: integer("purchases").notNull().default(0),
    landingPageViews: integer("landing_page_views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_creative_metrics_creative_id").on(table.creativeId),
    index("idx_creative_metrics_date").on(table.date),
  ]
);

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(),
    status: text("status").notNull().default("draft"),
    config: jsonb("config").notNull().default({}),
    schedule: jsonb("schedule").notNull().default({}),
    delivery: jsonb("delivery").notNull().default({}),
    classification: jsonb("classification"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_automations_workspace_id").on(table.workspaceId),
    index("idx_automations_type").on(table.type),
  ]
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    itemsCount: integer("items_count").notNull().default(0),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_automation_runs_automation_id").on(table.automationId),
  ]
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_boards_workspace_id").on(table.workspaceId)]
);

export const savedAds = pgTable(
  "saved_ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("discover"),
    metaLibraryId: text("meta_library_id"),
    brandName: text("brand_name"),
    headline: text("headline"),
    body: text("body"),
    format: text("format").notNull().default("image"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    landingPageUrl: text("landing_page_url"),
    platforms: text("platforms").array(),
    startDate: date("start_date"),
    runtimeDays: integer("runtime_days"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_saved_ads_board_id").on(table.boardId),
    index("idx_saved_ads_workspace_id").on(table.workspaceId),
  ]
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandGuidelineId: uuid("brand_guideline_id").references(
      () => brandGuidelinesTable.id,
      { onDelete: "set null" }
    ),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_assets_workspace_id").on(table.workspaceId),
    index("idx_assets_brand_guideline_id").on(table.brandGuidelineId),
  ]
);

export const variations = pgTable(
  "variations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    savedAdId: uuid("saved_ad_id")
      .references(() => savedAds.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("competitor"),
    strategy: text("strategy").notNull(),
    creativeOptions: jsonb("creative_options"),
    generatedImageUrl: text("generated_image_url"),
    generatedHeadline: text("generated_headline"),
    generatedBody: text("generated_body"),
    creditsUsed: integer("credits_used").notNull().default(10),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_variations_workspace_id").on(table.workspaceId),
    index("idx_variations_saved_ad_id").on(table.savedAdId),
    index("idx_variations_source").on(table.source),
  ]
);

export const generatedAds = pgTable(
  "generated_ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandGuidelineId: uuid("brand_guideline_id")
      .notNull()
      .references(() => brandGuidelinesTable.id, { onDelete: "cascade" }),
    backgroundAssetId: uuid("background_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    textVariant: text("text_variant").notNull(),
    fontFamily: text("font_family").notNull().default("Inter"),
    fontSize: integer("font_size").notNull().default(48),
    textColor: text("text_color").notNull().default("#FFFFFF"),
    textPosition: jsonb("text_position").notNull().default({ type: "center" }),
    imageUrl: text("image_url").notNull(),
    storagePath: text("storage_path").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: text("status").notNull().default("approved"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_generated_ads_workspace_id").on(table.workspaceId),
    index("idx_generated_ads_brand_guideline_id").on(table.brandGuidelineId),
    index("idx_generated_ads_background_asset_id").on(table.backgroundAssetId),
  ]
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: text("type").notNull(),
    referenceId: uuid("reference_id"),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_credit_transactions_workspace_id").on(table.workspaceId),
  ]
);

export const adInsights = pgTable(
  "ad_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    metaLibraryId: text("meta_library_id").notNull(),
    brandName: text("brand_name"),
    headline: text("headline"),
    bodyText: text("body_text"),
    format: text("format"),
    insights: jsonb("insights").notNull(),
    model: text("model").notNull().default("gpt-4o"),
    creditsUsed: integer("credits_used").notNull().default(2),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ad_insights_workspace_meta_library_idx").on(
      table.workspaceId,
      table.metaLibraryId
    ),
    index("idx_ad_insights_workspace_id").on(table.workspaceId),
  ]
);

export const adComparisons = pgTable(
  "ad_comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    adIds: text("ad_ids").array().notNull(),
    brandNames: text("brand_names").array().notNull(),
    result: jsonb("result").notNull(),
    model: text("model").notNull().default("gpt-4o"),
    creditsUsed: integer("credits_used").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ad_comparisons_workspace_id").on(table.workspaceId),
  ]
);

export const competitorBrands = pgTable(
  "competitor_brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metaAdsLibraryUrl: text("meta_ads_library_url"),
    description: text("description"),
    lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_competitor_brands_workspace_id").on(table.workspaceId),
  ]
);

export const competitorAds = pgTable(
  "competitor_ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitorBrandId: uuid("competitor_brand_id")
      .notNull()
      .references(() => competitorBrands.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    metaLibraryId: text("meta_library_id").notNull(),
    headline: text("headline"),
    bodyText: text("body_text"),
    format: text("format").notNull().default("image"),
    mediaType: text("media_type").notNull().default("image"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    landingPageUrl: text("landing_page_url"),
    platforms: text("platforms").array(),
    startDate: date("start_date"),
    runtimeDays: integer("runtime_days"),
    isActive: boolean("is_active").notNull().default(true),
    adsLibraryUrl: text("ads_library_url"),
    metadata: jsonb("metadata"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_competitor_ads_brand_id").on(table.competitorBrandId),
    index("idx_competitor_ads_workspace_id").on(table.workspaceId),
    uniqueIndex("competitor_ads_workspace_meta_library_idx").on(
      table.workspaceId,
      table.metaLibraryId
    ),
  ]
);

export const competitorReports = pgTable(
  "competitor_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    competitorBrandIds: text("competitor_brand_ids").array().notNull(),
    competitorBrandNames: text("competitor_brand_names").array().notNull(),
    adCount: integer("ad_count").notNull().default(0),
    perAdAnalyses: jsonb("per_ad_analyses").notNull().default([]),
    crossBrandSummary: jsonb("cross_brand_summary").notNull().default({}),
    model: text("model").notNull().default("gpt-4o"),
    creditsUsed: integer("credits_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_competitor_reports_workspace_id").on(table.workspaceId),
  ]
);

export const facebookPages = pgTable(
  "facebook_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: text("page_id").notNull(),
    pageName: text("page_name").notNull(),
    hasInstagram: boolean("has_instagram").notNull().default(false),
    instagramHandle: text("instagram_handle"),
    accessToken: text("access_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_facebook_pages_workspace_id").on(table.workspaceId),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => facebookPages.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull(),
    commenterName: text("commenter_name").notNull(),
    commenterId: text("commenter_id").notNull(),
    commentText: text("comment_text").notNull(),
    commentTime: timestamp("comment_time", { withTimezone: true }).notNull(),
    postType: text("post_type").notNull().default("organic"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_comments_workspace_id").on(table.workspaceId),
    index("idx_comments_page_id").on(table.pageId),
    index("idx_comments_is_read").on(table.isRead),
  ]
);

// Phase 14 Extension tables

export const brandGuidelinesTable = pgTable(
  "brand_guidelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    brandName: text("brand_name"),
    brandVoice: text("brand_voice"),
    colorPalette: jsonb("color_palette").notNull().default([]),
    typography: jsonb("typography").notNull().default({}),
    targetAudience: text("target_audience"),
    dosAndDonts: text("dos_and_donts"),
    logoUrl: text("logo_url"),
    files: jsonb("files").notNull().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("brand_guidelines_workspace_slug_idx").on(
      table.workspaceId,
      table.slug
    ),
    index("idx_brand_guidelines_workspace_id").on(table.workspaceId),
  ]
);

export const studioConversations = pgTable(
  "studio_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Conversation"),
    llmProvider: text("llm_provider").notNull().default("openai"),
    llmModel: text("llm_model").notNull().default("gpt-4o"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_studio_conversations_workspace_id").on(table.workspaceId),
  ]
);

export const studioMessages = pgTable(
  "studio_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => studioConversations.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    mentions: jsonb("mentions").notNull().default([]),
    resolvedContext: jsonb("resolved_context"),
    attachments: jsonb("attachments").notNull().default([]),
    creditsUsed: integer("credits_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_studio_messages_conversation_id").on(table.conversationId),
    index("idx_studio_messages_workspace_id").on(table.workspaceId),
  ]
);

// Phase 21 table

export const adDecompositions = pgTable(
  "ad_decompositions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceImageUrl: text("source_image_url").notNull(),
    sourceType: text("source_type").notNull().default("saved_ad"),
    sourceId: uuid("source_id"),
    extractedTexts: jsonb("extracted_texts").notNull().default([]),
    productAnalysis: jsonb("product_analysis").notNull().default({}),
    backgroundAnalysis: jsonb("background_analysis").notNull().default({}),
    layoutAnalysis: jsonb("layout_analysis").notNull().default({}),
    cleanImageUrl: text("clean_image_url"),
    processingStatus: text("processing_status").notNull().default("pending"),
    creditsUsed: integer("credits_used").notNull().default(5),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ad_decompositions_workspace_id").on(table.workspaceId),
    index("idx_ad_decompositions_source_image_url").on(table.sourceImageUrl),
  ]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  adAccounts: many(adAccounts),
  campaigns: many(campaigns),
  creatives: many(creatives),
  automations: many(automations),
  boards: many(boards),
  savedAds: many(savedAds),
  assets: many(assets),
  variations: many(variations),
  creditTransactions: many(creditTransactions),
  competitorBrands: many(competitorBrands),
  competitorAds: many(competitorAds),
  competitorReports: many(competitorReports),
  facebookPages: many(facebookPages),
  comments: many(comments),
  adInsights: many(adInsights),
  adComparisons: many(adComparisons),
  brandGuidelines: many(brandGuidelinesTable),
  studioConversations: many(studioConversations),
  studioMessages: many(studioMessages),
  adDecompositions: many(adDecompositions),
  generatedAds: many(generatedAds),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const adAccountsRelations = relations(adAccounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [adAccounts.workspaceId],
    references: [workspaces.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [campaigns.workspaceId],
    references: [workspaces.id],
  }),
  adAccount: one(adAccounts, {
    fields: [campaigns.adAccountId],
    references: [adAccounts.id],
  }),
  metrics: many(campaignMetrics),
  creatives: many(creatives),
}));

export const campaignMetricsRelations = relations(
  campaignMetrics,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignMetrics.campaignId],
      references: [campaigns.id],
    }),
  })
);

export const creativesRelations = relations(creatives, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [creatives.workspaceId],
    references: [workspaces.id],
  }),
  campaign: one(campaigns, {
    fields: [creatives.campaignId],
    references: [campaigns.id],
  }),
  metrics: many(creativeMetrics),
}));

export const creativeMetricsRelations = relations(
  creativeMetrics,
  ({ one }) => ({
    creative: one(creatives, {
      fields: [creativeMetrics.creativeId],
      references: [creatives.id],
    }),
  })
);

export const automationsRelations = relations(
  automations,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [automations.workspaceId],
      references: [workspaces.id],
    }),
    runs: many(automationRuns),
  })
);

export const automationRunsRelations = relations(
  automationRuns,
  ({ one }) => ({
    automation: one(automations, {
      fields: [automationRuns.automationId],
      references: [automations.id],
    }),
  })
);

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [boards.workspaceId],
    references: [workspaces.id],
  }),
  savedAds: many(savedAds),
}));

export const savedAdsRelations = relations(savedAds, ({ one, many }) => ({
  board: one(boards, {
    fields: [savedAds.boardId],
    references: [boards.id],
  }),
  workspace: one(workspaces, {
    fields: [savedAds.workspaceId],
    references: [workspaces.id],
  }),
  variations: many(variations),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [assets.workspaceId],
    references: [workspaces.id],
  }),
  brandGuideline: one(brandGuidelinesTable, {
    fields: [assets.brandGuidelineId],
    references: [brandGuidelinesTable.id],
  }),
  variations: many(variations),
  generatedAds: many(generatedAds),
}));

export const variationsRelations = relations(variations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [variations.workspaceId],
    references: [workspaces.id],
  }),
  savedAd: one(savedAds, {
    fields: [variations.savedAdId],
    references: [savedAds.id],
  }),
  asset: one(assets, {
    fields: [variations.assetId],
    references: [assets.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [creditTransactions.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const competitorBrandsRelations = relations(
  competitorBrands,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [competitorBrands.workspaceId],
      references: [workspaces.id],
    }),
    ads: many(competitorAds),
  })
);

export const competitorAdsRelations = relations(
  competitorAds,
  ({ one }) => ({
    competitorBrand: one(competitorBrands, {
      fields: [competitorAds.competitorBrandId],
      references: [competitorBrands.id],
    }),
    workspace: one(workspaces, {
      fields: [competitorAds.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const competitorReportsRelations = relations(
  competitorReports,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [competitorReports.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const facebookPagesRelations = relations(
  facebookPages,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [facebookPages.workspaceId],
      references: [workspaces.id],
    }),
    comments: many(comments),
  })
);

export const adInsightsRelations = relations(adInsights, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [adInsights.workspaceId],
    references: [workspaces.id],
  }),
}));

export const adComparisonsRelations = relations(adComparisons, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [adComparisons.workspaceId],
    references: [workspaces.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [comments.workspaceId],
    references: [workspaces.id],
  }),
  page: one(facebookPages, {
    fields: [comments.pageId],
    references: [facebookPages.id],
  }),
}));

export const brandGuidelinesRelations = relations(
  brandGuidelinesTable,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [brandGuidelinesTable.workspaceId],
      references: [workspaces.id],
    }),
    assets: many(assets),
    generatedAds: many(generatedAds),
  })
);

export const generatedAdsRelations = relations(
  generatedAds,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [generatedAds.workspaceId],
      references: [workspaces.id],
    }),
    brandGuideline: one(brandGuidelinesTable, {
      fields: [generatedAds.brandGuidelineId],
      references: [brandGuidelinesTable.id],
    }),
    backgroundAsset: one(assets, {
      fields: [generatedAds.backgroundAssetId],
      references: [assets.id],
    }),
  })
);

export const studioConversationsRelations = relations(
  studioConversations,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [studioConversations.workspaceId],
      references: [workspaces.id],
    }),
    messages: many(studioMessages),
  })
);

export const studioMessagesRelations = relations(
  studioMessages,
  ({ one }) => ({
    conversation: one(studioConversations, {
      fields: [studioMessages.conversationId],
      references: [studioConversations.id],
    }),
    workspace: one(workspaces, {
      fields: [studioMessages.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const adDecompositionsRelations = relations(
  adDecompositions,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [adDecompositions.workspaceId],
      references: [workspaces.id],
    }),
  })
);
