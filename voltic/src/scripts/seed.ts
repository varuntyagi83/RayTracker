/**
 * Development seed data script
 * Uses Supabase service role key to bypass RLS
 * Run: npm run seed
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function isoStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// ─── Seed data definitions ───────────────────────────────────────────────────

const AD_ACCOUNT_NAMES = [
  "HK Main Account", "HK Brand Awareness", "HK Retargeting", "SG Ecommerce",
  "SG Performance", "US Direct Response", "US Brand", "UK Main", "UK Retargeting",
  "AU Main", "AU Performance", "JP Brand", "JP Retargeting", "KR Main",
  "TW Ecommerce", "TH Performance", "MY Brand", "PH Direct", "ID Retargeting",
  "VN Main", "IN Performance", "DE Main", "FR Ecommerce", "IT Brand",
  "ES Retargeting", "NL Performance", "BE Main", "PT Direct", "SE Brand",
  "DK Retargeting", "NO Performance", "FI Main", "CH Ecommerce", "AT Brand",
  "PL Retargeting", "CZ Performance", "HU Main", "RO Direct", "BG Brand",
  "HR Retargeting", "SK Performance", "SI Main", "EE Ecommerce", "LV Brand",
  "LT Retargeting", "IE Performance", "GR Main", "CY Direct", "MT Brand",
  "LU Retargeting", "IS Performance", "NZ Main", "ZA Ecommerce", "AE Brand",
  "SA Retargeting", "QA Performance", "BH Main", "KW Direct", "OM Brand",
  "EG Retargeting", "MA Performance", "NG Main", "KE Ecommerce", "GH Brand",
  "TZ Retargeting", "UG Performance", "ET Main", "CM Direct", "SN Brand",
  "CI Retargeting", "MX Performance", "BR Main", "AR Ecommerce", "CL Brand",
  "CO Retargeting", "PE Performance", "EC Main", "VE Direct", "UY Brand",
  "PY Retargeting", "BO Performance", "CR Main", "PA Ecommerce", "DO Brand",
  "GT Retargeting", "HN Performance", "SV Main", "NI Direct", "CA Brand",
  "CA Retargeting", "US Lookalike", "US Catalog",
];

const CAMPAIGN_DEFINITIONS = [
  { name: "Summer_Sale_2024", objective: "CONVERSIONS", status: "active" },
  { name: "Brand_Awareness_Q1", objective: "BRAND_AWARENESS", status: "active" },
  { name: "Retargeting_High_Value", objective: "CONVERSIONS", status: "active" },
  { name: "New_Collection_Launch", objective: "CONVERSIONS", status: "active" },
  { name: "Holiday_Campaign_2024", objective: "CONVERSIONS", status: "paused" },
  { name: "Video_Views_Brand", objective: "VIDEO_VIEWS", status: "active" },
  { name: "Lead_Gen_Newsletter", objective: "LEAD_GENERATION", status: "active" },
  { name: "App_Install_Campaign", objective: "APP_INSTALLS", status: "paused" },
  { name: "Dynamic_Product_Ads", objective: "CATALOG_SALES", status: "active" },
  { name: "Lookalike_Prospecting", objective: "CONVERSIONS", status: "active" },
  { name: "Cart_Abandonment_Retarget", objective: "CONVERSIONS", status: "active" },
  { name: "Instagram_Stories_Reach", objective: "REACH", status: "active" },
  { name: "Facebook_Reels_Engagement", objective: "POST_ENGAGEMENT", status: "active" },
  { name: "Black_Friday_Sale", objective: "CONVERSIONS", status: "paused" },
  { name: "Spring_Clearance", objective: "CONVERSIONS", status: "active" },
  { name: "VIP_Customer_Upsell", objective: "CONVERSIONS", status: "active" },
  { name: "Influencer_Collaboration", objective: "BRAND_AWARENESS", status: "active" },
  { name: "Product_Launch_Teaser", objective: "REACH", status: "active" },
  { name: "Loyalty_Program_Drive", objective: "LEAD_GENERATION", status: "active" },
  { name: "Flash_Sale_Weekend", objective: "CONVERSIONS", status: "active" },
  { name: "Back_to_School_2024", objective: "CONVERSIONS", status: "paused" },
  { name: "Mothers_Day_Special", objective: "CONVERSIONS", status: "paused" },
  { name: "Fathers_Day_Sale", objective: "CONVERSIONS", status: "paused" },
  { name: "Cyber_Monday_Deals", objective: "CONVERSIONS", status: "paused" },
  { name: "Year_End_Clearance", objective: "CONVERSIONS", status: "active" },
  { name: "Valentine_Day_Promo", objective: "CONVERSIONS", status: "paused" },
  { name: "Easter_Sale_Special", objective: "CONVERSIONS", status: "paused" },
  { name: "Mid_Year_Sale", objective: "CONVERSIONS", status: "active" },
  { name: "Singles_Day_Campaign", objective: "CONVERSIONS", status: "paused" },
  { name: "Anniversary_Sale", objective: "CONVERSIONS", status: "active" },
  { name: "Referral_Program_Push", objective: "LEAD_GENERATION", status: "active" },
  { name: "User_Generated_Content", objective: "POST_ENGAGEMENT", status: "active" },
  { name: "Seasonal_Lookbook", objective: "BRAND_AWARENESS", status: "active" },
  { name: "Free_Shipping_Promo", objective: "CONVERSIONS", status: "active" },
  { name: "Bundle_Deal_Campaign", objective: "CATALOG_SALES", status: "active" },
  { name: "Testimonial_Ads", objective: "CONVERSIONS", status: "active" },
  { name: "Competitor_Conquest", objective: "CONVERSIONS", status: "active" },
  { name: "Geo_Targeted_Local", objective: "STORE_VISITS", status: "active" },
  { name: "Email_Subscriber_Retarget", objective: "CONVERSIONS", status: "active" },
  { name: "Website_Visitor_Retarget", objective: "CONVERSIONS", status: "active" },
  { name: "Engagement_Custom_Audience", objective: "CONVERSIONS", status: "active" },
  { name: "Broad_Targeting_Test", objective: "CONVERSIONS", status: "active" },
  { name: "Interest_Based_Cold", objective: "CONVERSIONS", status: "active" },
  { name: "ASC_Shopping_Campaign", objective: "CONVERSIONS", status: "active" },
  { name: "Advantage_Plus_Creative", objective: "CONVERSIONS", status: "active" },
  { name: "Catalog_Retargeting", objective: "CATALOG_SALES", status: "active" },
  { name: "Messenger_Campaign", objective: "MESSAGES", status: "active" },
  { name: "WhatsApp_Click_to_Chat", objective: "MESSAGES", status: "active" },
  { name: "Collection_Ad_Test", objective: "CONVERSIONS", status: "active" },
  { name: "Instant_Experience_Brand", objective: "BRAND_AWARENESS", status: "active" },
];

const CREATIVE_HEADLINES = [
  "Shop Now & Save 50%", "Limited Time Offer", "New Arrivals Just Dropped",
  "Don't Miss Out!", "Transform Your Style", "Exclusive Members Only",
  "Free Shipping Today", "Best Sellers Collection", "Your Next Favorite",
  "Upgrade Your Wardrobe", "Summer Essentials", "Winter Must-Haves",
  "Premium Quality, Fair Price", "Handcrafted Excellence", "Trending Now",
  "Customer Favorites", "Editor's Pick", "As Seen On Instagram",
  "Flash Sale: 24 Hours Only", "Buy One Get One Free",
];

const CREATIVE_BODIES = [
  "Discover our latest collection of premium products designed to elevate your everyday. Shop now and get free shipping on orders over $50.",
  "Join thousands of happy customers who've made the switch. Our products are crafted with care using sustainable materials.",
  "Limited stock available! Don't miss your chance to grab these bestsellers at unbeatable prices. Order today.",
  "Experience the difference quality makes. Our award-winning products come with a 30-day money-back guarantee.",
  "New season, new styles. Browse our curated selection of trending items handpicked by our design team.",
  "Treat yourself or someone special. Our gift sets are perfect for any occasion. Free gift wrapping included.",
  "Why pay more? Get premium quality at prices that won't break the bank. See what everyone's talking about.",
  "Your style, your way. Mix and match from our versatile collection to create looks you'll love.",
  "Back by popular demand! Our most-requested items are finally restocked. Get yours before they sell out again.",
  "Sustainable fashion without compromise. Every purchase plants a tree. Shop with purpose today.",
];

const LANDING_PAGES = [
  "https://example.com/shop/summer-sale",
  "https://example.com/collections/new-arrivals",
  "https://example.com/shop/best-sellers",
  "https://example.com/collections/premium",
  "https://example.com/shop/clearance",
  "https://example.com/collections/trending",
  "https://example.com/shop/bundles",
  "https://example.com/collections/gifts",
];

const BRAND_NAMES = [
  "Nike", "Adidas", "Glossier", "Warby Parker", "Allbirds",
  "Casper", "Dollar Shave Club", "Away", "Everlane", "Bombas",
];

const PAGE_NAMES = [
  "Voltic Official", "Voltic HK", "Voltic Singapore", "Voltic US",
  "Voltic UK", "Voltic Australia", "Voltic Japan", "Voltic Korea",
  "Voltic Taiwan", "Voltic Thailand", "Voltic Malaysia", "Voltic Philippines",
  "Voltic Indonesia", "Voltic Vietnam", "Voltic India", "Voltic Germany",
  "Voltic France", "Voltic Italy", "Voltic Spain", "Voltic Netherlands",
  "Voltic Belgium", "Voltic Portugal", "Voltic Sweden", "Voltic Denmark",
  "Voltic Norway", "Voltic Finland", "Voltic Switzerland", "Voltic Austria",
  "Voltic Poland", "Voltic Czech", "Voltic Hungary", "Voltic Romania",
  "Voltic Ireland", "Voltic Greece", "Voltic New Zealand", "Voltic South Africa",
  "Voltic UAE", "Voltic Saudi", "Voltic Qatar", "Voltic Mexico",
  "Voltic Brazil", "Voltic Argentina", "Voltic Chile", "Voltic Colombia",
  "Voltic Canada", "Voltic Peru", "Voltic Nigeria", "Voltic Kenya",
];

const COMMENT_TEXTS = [
  "Love this product! Just ordered mine 😍",
  "When will this be back in stock?",
  "Does this come in other colors?",
  "Shipping was super fast, thank you!",
  "Can you ship internationally?",
  "Is there a discount code available?",
  "This looks amazing! Price?",
  "Just received mine and it's perfect!",
  "Do you have a size guide?",
  "How long does delivery take to Hong Kong?",
  "Been using this for 2 weeks now, absolutely love it!",
  "Is this sustainable/eco-friendly?",
  "My friend recommended this, can't wait to try!",
  "What's the return policy?",
  "This ad keeps showing up and I finally caved 😂",
  "Quality looks great in the photos, is it the same IRL?",
  "Can I use this with my existing setup?",
  "Any Black Friday deals coming?",
  "Just bought 3 of these as gifts!",
  "Customer service was incredibly helpful, 5 stars!",
];

// ─── Main seed function ──────────────────────────────────────────────────────

async function seed() {
  console.log("Starting seed...\n");

  // 1. Get or create workspace
  console.log("1. Setting up workspace...");
  const { data: existingWorkspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", "voltic-demo")
    .limit(1);

  let workspaceId: string;

  if (existingWorkspaces && existingWorkspaces.length > 0) {
    workspaceId = existingWorkspaces[0].id;
    // Update to match seed spec
    await supabase
      .from("workspaces")
      .update({
        name: "Voltic Demo",
        timezone: "Asia/Hong_Kong",
        currency: "HKD",
        credit_balance: 500,
      })
      .eq("id", workspaceId);
    console.log(`   Using existing workspace: ${workspaceId}`);
  } else {
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({
        name: "Voltic Demo",
        slug: "voltic-demo",
        timezone: "Asia/Hong_Kong",
        currency: "HKD",
        credit_balance: 500,
      })
      .select("id")
      .single();
    if (wsErr) throw new Error(`Failed to create workspace: ${wsErr.message}`);
    workspaceId = ws.id;
    console.log(`   Created workspace: ${workspaceId}`);
  }

  // 2. Ad Accounts (91)
  console.log("2. Creating 91 ad accounts...");
  const adAccountRows = AD_ACCOUNT_NAMES.map((name, i) => ({
    workspace_id: workspaceId,
    meta_account_id: `act_${100000000 + i}`,
    name,
    currency: randomChoice(["USD", "HKD", "SGD", "GBP", "EUR", "AUD", "JPY"]),
    timezone: randomChoice([
      "Asia/Hong_Kong", "Asia/Singapore", "America/New_York",
      "Europe/London", "Australia/Sydney", "Asia/Tokyo",
    ]),
    status: randomChoice(["active", "active", "active", "paused"]),
    last_synced_at: isoStr(randomInt(0, 2)),
  }));

  const { data: adAccounts, error: aaErr } = await supabase
    .from("ad_accounts")
    .upsert(adAccountRows, { onConflict: "meta_account_id" })
    .select("id, name");
  if (aaErr) throw new Error(`Failed to create ad accounts: ${aaErr.message}`);
  console.log(`   Created ${adAccounts!.length} ad accounts`);

  // 3. Campaigns (50)
  console.log("3. Creating 50 campaigns...");
  const campaignRows = CAMPAIGN_DEFINITIONS.map((def, i) => ({
    workspace_id: workspaceId,
    ad_account_id: adAccounts![i % adAccounts!.length].id,
    meta_campaign_id: `camp_${200000000 + i}`,
    name: def.name,
    status: def.status,
    objective: def.objective,
    daily_budget: randomBetween(50, 2000).toFixed(2),
    lifetime_budget: randomBetween(5000, 100000).toFixed(2),
  }));

  const { data: campaignData, error: campErr } = await supabase
    .from("campaigns")
    .insert(campaignRows)
    .select("id, name");
  if (campErr) throw new Error(`Failed to create campaigns: ${campErr.message}`);
  console.log(`   Created ${campaignData!.length} campaigns`);

  // 4. Campaign Metrics (30 days per campaign)
  console.log("4. Creating campaign metrics (30 days × 50 campaigns)...");
  const metricRows: Array<Record<string, unknown>> = [];
  for (const campaign of campaignData!) {
    for (let day = 0; day < 30; day++) {
      const spend = randomBetween(100, 5000);
      const roas = randomBetween(0.5, 5.0);
      const revenue = spend * roas;
      const impressions = randomInt(5000, 200000);
      const clicks = randomInt(
        Math.floor(impressions * 0.005),
        Math.floor(impressions * 0.05)
      );
      const ctr = clicks / impressions;
      const purchases = randomInt(0, Math.floor(clicks * 0.1));
      const lpViews = randomInt(
        Math.floor(clicks * 0.5),
        clicks
      );

      metricRows.push({
        campaign_id: campaign.id,
        date: dateStr(day),
        spend: spend.toFixed(2),
        revenue: revenue.toFixed(2),
        roas: roas.toFixed(4),
        impressions,
        clicks,
        ctr: ctr.toFixed(4),
        purchases,
        landing_page_views: lpViews,
      });
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < metricRows.length; i += 500) {
    const batch = metricRows.slice(i, i + 500);
    const { error: mErr } = await supabase
      .from("campaign_metrics")
      .insert(batch);
    if (mErr) throw new Error(`Failed to insert campaign metrics batch ${i}: ${mErr.message}`);
  }
  console.log(`   Created ${metricRows.length} campaign metric rows`);

  // 5. Creatives (20)
  console.log("5. Creating 20 creatives...");
  const creativeRows = Array.from({ length: 20 }, (_, i) => ({
    workspace_id: workspaceId,
    campaign_id: campaignData![i % campaignData!.length].id,
    meta_creative_id: `cre_${300000000 + i}`,
    name: `Creative_${i + 1}_${randomChoice(["Image", "Video", "Carousel"])}`,
    headline: CREATIVE_HEADLINES[i % CREATIVE_HEADLINES.length],
    body: CREATIVE_BODIES[i % CREATIVE_BODIES.length],
    landing_page_url: LANDING_PAGES[i % LANDING_PAGES.length],
    image_url: `https://picsum.photos/seed/creative${i}/800/800`,
    video_url: i % 3 === 1 ? `https://example.com/videos/ad_${i}.mp4` : null,
    format: randomChoice(["image", "image", "video", "carousel"]),
    status: randomChoice(["active", "active", "paused"]),
  }));

  const { data: creativeData, error: crErr } = await supabase
    .from("creatives")
    .insert(creativeRows)
    .select("id");
  if (crErr) throw new Error(`Failed to create creatives: ${crErr.message}`);
  console.log(`   Created ${creativeData!.length} creatives`);

  // 6. Creative Metrics (30 days per creative)
  console.log("6. Creating creative metrics (30 days × 20 creatives)...");
  const creativeMetricRows: Array<Record<string, unknown>> = [];
  for (const creative of creativeData!) {
    for (let day = 0; day < 30; day++) {
      const spend = randomBetween(50, 2000);
      const roas = randomBetween(0.5, 5.0);
      const revenue = spend * roas;
      const impressions = randomInt(2000, 100000);
      const clicks = randomInt(
        Math.floor(impressions * 0.005),
        Math.floor(impressions * 0.05)
      );
      const ctr = clicks / impressions;
      const purchases = randomInt(0, Math.floor(clicks * 0.08));
      const lpViews = randomInt(Math.floor(clicks * 0.5), clicks);

      creativeMetricRows.push({
        creative_id: creative.id,
        date: dateStr(day),
        spend: spend.toFixed(2),
        revenue: revenue.toFixed(2),
        roas: roas.toFixed(4),
        impressions,
        clicks,
        ctr: ctr.toFixed(4),
        purchases,
        landing_page_views: lpViews,
      });
    }
  }

  for (let i = 0; i < creativeMetricRows.length; i += 500) {
    const batch = creativeMetricRows.slice(i, i + 500);
    const { error: cmErr } = await supabase
      .from("creative_metrics")
      .insert(batch);
    if (cmErr) throw new Error(`Failed to insert creative metrics batch ${i}: ${cmErr.message}`);
  }
  console.log(`   Created ${creativeMetricRows.length} creative metric rows`);

  // 7. Automations (5)
  console.log("7. Creating 5 automations...");
  const automationRows = [
    {
      workspace_id: workspaceId,
      name: "Daily Performance Digest",
      description: "Daily summary of top performing campaigns by ROAS",
      type: "performance",
      status: "active",
      config: {
        aggregation_level: "campaigns",
        metrics: ["spend", "roas", "revenue", "purchases"],
        time_periods: ["yesterday", "today", "last_7d"],
        sort_by: { metric: "roas", direction: "desc", period: "yesterday" },
        classification: { enabled: true, critical_threshold: 0.8, top_threshold: 2.0 },
      },
      schedule: { frequency: "daily", time: "09:00", timezone: "Asia/Hong_Kong" },
      delivery: { platform: "slack", channel: "#performance-reports" },
      last_run_at: isoStr(0),
    },
    {
      workspace_id: workspaceId,
      name: "Weekly Creative Report",
      description: "Weekly top creatives by spend and ROAS",
      type: "performance",
      status: "active",
      config: {
        aggregation_level: "creatives",
        metrics: ["spend", "roas", "impressions", "ctr"],
        time_periods: ["last_7d"],
        sort_by: { metric: "spend", direction: "desc", period: "last_7d" },
        classification: { enabled: false },
      },
      schedule: { frequency: "weekly", time: "10:00", timezone: "Asia/Hong_Kong", days: ["monday"] },
      delivery: { platform: "slack", channel: "#creative-reports" },
      last_run_at: isoStr(3),
    },
    {
      workspace_id: workspaceId,
      name: "Landing Page Performance",
      description: "Track landing page CTR and conversion performance",
      type: "performance",
      status: "paused",
      config: {
        aggregation_level: "landing_pages",
        metrics: ["spend", "clicks", "ctr", "landing_page_views"],
        time_periods: ["yesterday", "last_7d"],
        sort_by: { metric: "ctr", direction: "desc", period: "yesterday" },
        classification: { enabled: false },
      },
      schedule: { frequency: "daily", time: "08:00", timezone: "Asia/Hong_Kong" },
      delivery: { platform: "slack", channel: "#landing-pages" },
      last_run_at: isoStr(7),
    },
    {
      workspace_id: workspaceId,
      name: "Competitor Watch: Nike",
      description: "Track Nike's new ad creatives from the Meta Ads Library",
      type: "competitor",
      status: "active",
      config: {
        competitor_name: "Nike",
        meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=nike",
        scrape_settings: { top_n: 20, impression_period: "last_30d", started_within: "7d" },
      },
      schedule: { frequency: "daily", time: "07:00", timezone: "Asia/Hong_Kong" },
      delivery: { platform: "slack", channel: "#competitor-intel" },
      last_run_at: isoStr(1),
    },
    {
      workspace_id: workspaceId,
      name: "Comment Digest - All Pages",
      description: "Hourly digest of new comments across all Facebook and Instagram pages",
      type: "comments",
      status: "draft",
      config: {
        pages: "all",
        post_filters: { type: "all", max_age_days: 7 },
        frequency: "6h",
      },
      schedule: { frequency: "daily", time: "12:00", timezone: "Asia/Hong_Kong" },
      delivery: { platform: "slack", channel: "#social-comments" },
      last_run_at: null,
    },
  ];

  const { data: automationData, error: autoErr } = await supabase
    .from("automations")
    .insert(automationRows)
    .select("id, name");
  if (autoErr) throw new Error(`Failed to create automations: ${autoErr.message}`);
  console.log(`   Created ${automationData!.length} automations`);

  // 8. Boards (2) + Saved Ads
  console.log("8. Creating 2 boards with saved ads...");
  const boardRows = [
    { workspace_id: workspaceId, name: "Competitor Inspiration", description: "Saved competitor ads for creative reference" },
    { workspace_id: workspaceId, name: "Product Launch Ideas", description: "Ad inspiration for upcoming product launches" },
  ];

  const { data: boardData, error: bErr } = await supabase
    .from("boards")
    .insert(boardRows)
    .select("id, name");
  if (bErr) throw new Error(`Failed to create boards: ${bErr.message}`);
  console.log(`   Created ${boardData!.length} boards`);

  const savedAdRows = Array.from({ length: 12 }, (_, i) => ({
    board_id: boardData![i < 6 ? 0 : 1].id,
    workspace_id: workspaceId,
    source: randomChoice(["discover", "extension", "competitor"] as const),
    meta_library_id: `lib_${400000000 + i}`,
    brand_name: BRAND_NAMES[i % BRAND_NAMES.length],
    headline: CREATIVE_HEADLINES[i % CREATIVE_HEADLINES.length],
    body: CREATIVE_BODIES[i % CREATIVE_BODIES.length],
    format: randomChoice(["image", "video", "carousel"]),
    image_url: `https://picsum.photos/seed/saved${i}/600/600`,
    landing_page_url: LANDING_PAGES[i % LANDING_PAGES.length],
    platforms: randomChoice([
      ["facebook"],
      ["instagram"],
      ["facebook", "instagram"],
    ]),
    start_date: dateStr(randomInt(7, 90)),
    runtime_days: randomInt(7, 120),
  }));

  const { data: savedAdData, error: saErr } = await supabase
    .from("saved_ads")
    .insert(savedAdRows)
    .select("id");
  if (saErr) throw new Error(`Failed to create saved ads: ${saErr.message}`);
  console.log(`   Created ${savedAdData!.length} saved ads`);

  // 9. Assets (2)
  console.log("9. Creating 2 assets...");
  const assetRows = [
    {
      workspace_id: workspaceId,
      name: "Voltic Pro Headphones",
      description: "Premium wireless noise-cancelling headphones with 40-hour battery life",
      image_url: "https://picsum.photos/seed/product1/800/800",
      metadata: { sku: "VP-HP-001", price: 299.99, category: "Electronics" },
    },
    {
      workspace_id: workspaceId,
      name: "Voltic Smart Watch",
      description: "Fitness tracking smartwatch with heart rate monitor and GPS",
      image_url: "https://picsum.photos/seed/product2/800/800",
      metadata: { sku: "VP-SW-001", price: 199.99, category: "Wearables" },
    },
  ];

  const { data: assetData, error: asErr } = await supabase
    .from("assets")
    .insert(assetRows)
    .select("id");
  if (asErr) throw new Error(`Failed to create assets: ${asErr.message}`);
  console.log(`   Created ${assetData!.length} assets`);

  // 10. Facebook Pages (48)
  console.log("10. Creating 48 facebook pages...");
  const pageRows = PAGE_NAMES.map((pageName, i) => ({
    workspace_id: workspaceId,
    page_id: `page_${500000000 + i}`,
    page_name: pageName,
    has_instagram: i % 3 !== 2, // ~66% have Instagram
    instagram_handle: i % 3 !== 2 ? `@${pageName.toLowerCase().replace(/\s+/g, "")}` : null,
    access_token: `token_placeholder_${i}`,
  }));

  const { data: pageData, error: pgErr } = await supabase
    .from("facebook_pages")
    .insert(pageRows)
    .select("id, page_name");
  if (pgErr) throw new Error(`Failed to create facebook pages: ${pgErr.message}`);
  console.log(`   Created ${pageData!.length} facebook pages`);

  // 11. Comments (20)
  console.log("11. Creating 20 comments...");
  const commentRows = Array.from({ length: 20 }, (_, i) => ({
    workspace_id: workspaceId,
    page_id: pageData![i % pageData!.length].id,
    post_id: `post_${600000000 + i}`,
    commenter_name: `User ${randomInt(1000, 9999)}`,
    commenter_id: `user_${700000000 + i}`,
    comment_text: COMMENT_TEXTS[i % COMMENT_TEXTS.length],
    comment_time: isoStr(randomInt(0, 7)),
    post_type: randomChoice(["organic", "ad"]),
    is_read: i < 10,
  }));

  const { data: commentData, error: coErr } = await supabase
    .from("comments")
    .insert(commentRows)
    .select("id");
  if (coErr) throw new Error(`Failed to create comments: ${coErr.message}`);
  console.log(`   Created ${commentData!.length} comments`);

  // 12. Credit Transaction (initial bonus)
  console.log("12. Creating initial credit transaction...");
  const { error: ctErr } = await supabase.from("credit_transactions").insert({
    workspace_id: workspaceId,
    amount: 500,
    type: "bonus",
    description: "Welcome bonus — 500 credits",
  });
  if (ctErr) throw new Error(`Failed to create credit transaction: ${ctErr.message}`);
  console.log("   Created initial bonus credit transaction (+500)");

  // 13. Competitor Brands
  console.log("13. Creating competitor brands...");
  const competitorRows = [
    {
      workspace_id: workspaceId,
      name: "Nike",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=nike",
      description: "Global athletic footwear and apparel brand",
    },
    {
      workspace_id: workspaceId,
      name: "Adidas",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=adidas",
      description: "International sportswear manufacturer",
    },
    {
      workspace_id: workspaceId,
      name: "Glossier",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=glossier",
      description: "Direct-to-consumer beauty brand",
    },
  ];

  const { data: compData, error: compErr } = await supabase
    .from("competitor_brands")
    .insert(competitorRows)
    .select("id");
  if (compErr) throw new Error(`Failed to create competitor brands: ${compErr.message}`);
  console.log(`   Created ${compData!.length} competitor brands`);

  console.log("\n✅ Seed complete!");
  console.log(`
Summary:
  Workspace: Voltic Demo (${workspaceId})
  Ad Accounts: ${adAccounts!.length}
  Campaigns: ${campaignData!.length}
  Campaign Metrics: ${metricRows.length}
  Creatives: ${creativeData!.length}
  Creative Metrics: ${creativeMetricRows.length}
  Automations: ${automationData!.length}
  Boards: ${boardData!.length}
  Saved Ads: ${savedAdData!.length}
  Assets: ${assetData!.length}
  Facebook Pages: ${pageData!.length}
  Comments: ${commentData!.length}
  Competitor Brands: ${compData!.length}
  Credit Transactions: 1
  `);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
