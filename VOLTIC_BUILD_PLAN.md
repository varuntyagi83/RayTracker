# VOLTIC_BUILD_PLAN.md — 20-Phase Implementation Spec

> **How Claude Code uses this file:** Read CLAUDE.md for project rules. Read PROGRESS.md to find the next incomplete phase. Then find that phase below and execute it. After completing all verification checks, update PROGRESS.md and commit.

---

## TABLE OF CONTENTS

| Phase | Feature | Est. Effort |
|-------|---------|-------------|
| 0 | Project Bootstrap | 30 min |
| 1 | Auth & Workspace System | 2 hrs |
| 2 | Database Schema & Seed Data | 2 hrs |
| 3 | Sidebar Navigation & Layout Shell | 1.5 hrs |
| 4 | Workspace Overview Dashboard | 3 hrs |
| 5 | Automations — Performance Wizard | 4 hrs |
| 6 | Automations — Competitor Wizard | 3 hrs |
| 7 | Automations — Comment Digest | 2 hrs |
| 8 | Slack Bot Integration & Execution Engine | 4 hrs |
| 9 | Reports Module (6 Report Types) | 3 hrs |
| 10 | Campaign Analysis | 3 hrs |
| 11 | Discover (Ad Library Browser) | 3 hrs |
| 12 | Boards (Creative Swipe Files) | 2.5 hrs |
| 13 | Assets / Product Catalog | 2 hrs |
| 14 | AI Creative Variations | 4 hrs |
| 15 | Chrome Extension | 3 hrs |
| 16 | PostHog Analytics Deep Integration | 2 hrs |
| 17 | Credit System & Billing | 2 hrs |
| 18 | Production Hardening | 3 hrs |
| 19 | Testing & QA | 3 hrs |
| 20 | Deployment & CI/CD | 2 hrs |

**Total estimated: ~53 hours of Claude Code execution**

---

## PHASE 0: PROJECT BOOTSTRAP

**Goal:** Create the Next.js project, install all dependencies, set up the folder structure, and initialize git.

### Steps:

1. Create the project:
```bash
npx create-next-app@latest voltic --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd voltic
```

2. Install all dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr drizzle-orm drizzle-kit postgres posthog-js posthog-node recharts lucide-react class-variance-authority clsx tailwind-merge date-fns zod zustand @slack/web-api
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet sidebar tabs textarea toast toggle tooltip badge avatar command popover calendar table switch progress skeleton scroll-area
```

3. Create project structure as defined in CLAUDE.md under "Project Structure"

4. Create `.env.local` template:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
META_APP_ID=
META_APP_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Initialize git:
```bash
git init && git add . && git commit -m "chore: initial project setup with Next.js 15, Tailwind, shadcn/ui, Supabase, PostHog"
```

### VERIFY:
- [ ] `npm run dev` starts without errors
- [ ] `npx tsc --noEmit` passes
- [ ] Project structure matches CLAUDE.md specification
- [ ] All shadcn components installed
- [ ] .env.local template exists

Update PROGRESS.md → Phase 0 ✅

---

## PHASE 1: AUTH & WORKSPACE SYSTEM

**Goal:** Users can sign up, log in, and be associated with a workspace. Protected routes redirect unauthenticated users. PostHog identifies users.

### 1A. Supabase Auth Setup

Create Supabase clients:
- `src/lib/supabase/client.ts` — browser client (for client components)
- `src/lib/supabase/server.ts` — server client (for server components and server actions)
- `src/middleware.ts` — refresh auth tokens on every request, redirect unauthenticated users from (dashboard)/ to /login

### 1B. Auth Pages

**(auth)/login/page.tsx:**
- Email + password form
- "Don't have an account? Sign up" link
- Google OAuth button (styled, can be disabled if no credentials)
- Clean centered card layout with Voltic branding (green accent color)

**(auth)/signup/page.tsx:**
- Email + password + workspace name fields
- On signup: create user → create workspace → create workspace_member → redirect to /home
- "Already have an account? Log in" link

### 1C. Workspace Database Tables

**workspaces:**
- id: uuid (pk, default gen_random_uuid())
- name: text (not null)
- slug: text (unique, auto-generated from name)
- timezone: text (default 'UTC')
- currency: text (default 'USD')
- credit_balance: integer (default 100)
- meta_access_token: text (nullable, encrypted)
- slack_team_id: text (nullable)
- slack_access_token: text (nullable)
- slack_team_name: text (nullable)
- settings: jsonb (default '{}')
- created_at: timestamptz (default now())
- updated_at: timestamptz (default now())

**workspace_members:**
- id: uuid (pk)
- workspace_id: uuid (fk → workspaces.id)
- user_id: uuid (fk → auth.users.id)
- role: text ('owner' | 'admin' | 'member')
- created_at: timestamptz (default now())

### 1D. Workspace Context

- `src/lib/hooks/use-workspace.ts` — React hook providing workspace_id, workspace name, and settings to client components
- Server-side helper: `getWorkspace(cookieStore)` that reads auth session and fetches workspace

### 1E. PostHog Initialization

`src/lib/analytics/posthog-provider.tsx`:
- PostHogProvider wrapping the entire app
- Identify user on login: `posthog.identify(userId, { email, name })`
- Group by workspace: `posthog.group('workspace', workspaceId, { name })`
- Automatic page view tracking

PostHog events:
- `user_signed_up` with `{ workspace_name }`
- `user_logged_in`
- `user_logged_out`

### VERIFY:
- [ ] Signup creates user AND workspace in database
- [ ] Login redirects to /home
- [ ] Unauthenticated /home access redirects to /login
- [ ] WorkspaceProvider provides workspace_id in client components
- [ ] `getWorkspace()` works in server components
- [ ] PostHog identifies user and groups by workspace on login
- [ ] Logout clears session and redirects to /login
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run dev` runs without errors

Update PROGRESS.md → Phase 1 ✅
Commit: `feat: auth system with workspace creation and PostHog identification`

---

## PHASE 2: DATABASE SCHEMA & SEED DATA

**Goal:** Create the complete database schema for the ENTIRE app upfront (prevents migration churn later), and populate with realistic seed data for development.

### 2A. Full Drizzle Schema — `src/db/schema.ts`

Define ALL tables. Reference CLAUDE.md for naming conventions.

**ad_accounts:** id, workspace_id (fk), meta_account_id (text, unique), name, currency, timezone, status ('active'|'paused'|'disconnected'), last_synced_at, created_at, updated_at

**campaigns:** id, workspace_id (fk), ad_account_id (fk), meta_campaign_id (text), name, status, objective, daily_budget, lifetime_budget, created_at, updated_at

**campaign_metrics** (daily snapshots): id, campaign_id (fk), date (date), spend (decimal), revenue (decimal), roas (decimal), impressions (int), clicks (int), ctr (decimal), purchases (int), landing_page_views (int), created_at

**creatives:** id, workspace_id (fk), campaign_id (fk), meta_creative_id (text), name, headline, body, landing_page_url, image_url, video_url, format ('image'|'video'|'carousel'), status, created_at, updated_at

**creative_metrics** (daily snapshots): id, creative_id (fk), date, spend, revenue, roas, impressions, clicks, ctr, purchases, landing_page_views, created_at

**automations:** id, workspace_id (fk), name, description, type ('performance'|'competitor'|'comments'), status ('active'|'paused'|'draft'), config (jsonb), schedule (jsonb), delivery (jsonb), classification (jsonb), last_run_at, created_at, updated_at

**automation_runs:** id, automation_id (fk), status ('success'|'failed'|'partial'), started_at, completed_at, items_count (int), error_message (text nullable), metadata (jsonb)

**boards:** id, workspace_id (fk), name, description, created_at, updated_at

**saved_ads:** id, board_id (fk), workspace_id (fk), source ('discover'|'extension'|'competitor'), meta_library_id (text), brand_name, headline, body, format ('image'|'video'|'carousel'), image_url, video_url, landing_page_url, platforms (text[]), start_date (date nullable), runtime_days (int nullable), metadata (jsonb), created_at

**assets:** id, workspace_id (fk), name, description, image_url (text not null), metadata (jsonb), created_at, updated_at

**variations:** id, workspace_id (fk), saved_ad_id (fk), asset_id (fk), strategy ('hero_product'|'curiosity'|'pain_point'|'proof_point'|'image_only'|'text_only'), generated_image_url, generated_headline, generated_body, credits_used (int), status ('pending'|'completed'|'failed'), created_at

**credit_transactions:** id, workspace_id (fk), amount (int, positive=credit negative=debit), type ('purchase'|'variation'|'bonus'|'refund'), reference_id (uuid nullable), description, created_at

**competitor_brands:** id, workspace_id (fk), name, meta_ads_library_url, description, last_scraped_at, created_at, updated_at

**facebook_pages:** id, workspace_id (fk), page_id (text), page_name, has_instagram (boolean), instagram_handle (text nullable), access_token (text), created_at

**comments:** id, workspace_id (fk), page_id (fk → facebook_pages.id), post_id (text), commenter_name, commenter_id (text), comment_text, comment_time (timestamptz), post_type ('organic'|'ad'), is_read (boolean default false), created_at

### 2B. Drizzle Config & Migration

- Create `drizzle.config.ts` pointing to Supabase
- Generate migration: `npx drizzle-kit generate`
- Push to database: `npx drizzle-kit push`

### 2C. Seed Data — `scripts/seed.ts`

Create realistic development data:
- 1 workspace ("Voltic Demo", timezone: Asia/Hong_Kong, currency: HKD, credit_balance: 500)
- 91 ad accounts with realistic names
- 50 campaigns across accounts (Summer_Sale_2024, Brand_Awareness_Q1, Retargeting_High_Value, etc.)
- 30 days of campaign_metrics per campaign with realistic ranges (spend: $100-$5000/day, ROAS: 0.5-5x, revenue derived from spend × ROAS)
- 20 creatives with placeholder images (via picsum.photos), varied headlines and body text
- 30 days of creative_metrics
- 5 automations (3 performance with varied configs, 1 competitor, 1 comment digest), mix of active/paused/draft
- 2 boards ("Competitor Inspiration", "Product Launch Ideas") with saved ads
- 2 assets (products with placeholder images)
- 48 facebook_pages (some with Instagram)
- 20 sample comments across pages
- Initial credit transaction (bonus: +500)

Add `"seed": "npx tsx scripts/seed.ts"` to package.json scripts.

### VERIFY:
- [ ] All tables exist in Supabase
- [ ] `npm run seed` completes without errors and populates all tables
- [ ] Quick test queries work for each table via Drizzle
- [ ] Foreign key relationships correct
- [ ] Seed data is realistic
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 2 ✅
Commit: `feat: complete database schema with Drizzle ORM and realistic seed data`

---

## PHASE 3: SIDEBAR NAVIGATION & LAYOUT SHELL

**Goal:** Build the dashboard layout with collapsible sidebar matching Voltic's exact navigation structure. Every route has a placeholder page.

### 3A. Dashboard Layout — `(dashboard)/layout.tsx`

Server component: check auth → fetch workspace → render Sidebar + main area → wrap in WorkspaceProvider.

### 3B. Sidebar — `components/layout/sidebar.tsx`

`"use client"` component matching Voltic's sidebar:

**Top:** Workspace avatar ("G" green circle) + name + dropdown chevron, layout toggle icon

**Navigation:**
🏠 Home → `/home` · ⚡ Automations → `/automations` · 📊 Campaign Analysis → `/campaign-analysis` · 🔍 Discover → `/discover` · 📋 Boards → `/boards` · 🖼 Assets → `/assets` · ➕ Create report

**REPORTS Section:**
📈 Top Ads · 📊 Top Campaigns · 🎨 Top Creatives · 🔗 Top Landing Pages · **T** Top Headlines · **99** Top Copy

**FOLDERS Section:** ➕ Create folder (empty initially)

**Bottom:** User avatar + name + settings/logout dropdown

Active state: green left border + bold + background highlight

### 3C. Top Bar — `components/layout/top-bar.tsx`

Meta icon + sync status, Refresh button, page-specific action slot.

### 3D. Placeholder Pages

Create all 12 routes with `<h1>Page Name</h1>` placeholder.

PostHog: `sidebar_nav_clicked` with `{ destination, current_page }`

### VERIFY:
- [ ] Sidebar renders all items in correct order
- [ ] Active page has green left border
- [ ] All 12 routes navigate and render placeholders
- [ ] Workspace name in sidebar header, user at bottom
- [ ] Logout works
- [ ] Responsive sidebar collapse on mobile
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 3 ✅
Commit: `feat: dashboard layout with sidebar navigation matching Voltic UI`

---

## PHASE 4: WORKSPACE OVERVIEW DASHBOARD

**Goal:** Build the Home page showing aggregate KPIs across all ad accounts and top performing assets with tabbed view.

### 4A. Page Header
"Workspace Overview" H1, "Last synced ({timezone}): {date}, {time}" subtitle, Meta icon + Refresh, "Overall metrics for {N} Meta ad accounts"

### 4B. KPI Summary Cards — Three horizontal cards:

**Revenue:** $ green icon, "Revenue", % change (red↓ / green↑), primary value (formatted), "Today" label, mini bar chart (Today vs Yesterday), bottom: YESTERDAY | LAST 7 DAYS

**Spend:** Same structure, wallet icon.
**Profit:** Same structure, trend icon + "{N}% margin" badge. profit = revenue − spend.

Data: aggregate campaign_metrics across all workspace ad_accounts.

### 4C. Top Performing Assets

⚡ "Top Performing Assets", Tabs: **Creatives** | Headlines | Copy | Landing Pages

Creatives (default): horizontal scroll, cards with thumbnail + "IMAGE" badge, ROAS, SPEND, IMPRESSIONS. Headlines: text + metrics. Copy: truncated body + metrics. Landing Pages: URL + metrics + CTR.

### 4D. Data Functions — `src/lib/data/dashboard.ts`
`getWorkspaceKPIs(workspaceId, timezone)`, `getTopCreatives(...)`, `getTopHeadlines(...)`, `getTopCopy(...)`, `getTopLandingPages(...)`

PostHog: `dashboard_loaded`, `top_assets_tab_switched`, `refresh_clicked`

### VERIFY:
- [ ] 3 KPI cards with correct aggregate data
- [ ] % change arrows color-coded
- [ ] Mini bar charts render
- [ ] Tab bar switches content
- [ ] Creative cards show thumbnail, ROAS, Spend, Impressions
- [ ] Horizontal scroll works
- [ ] Refresh re-fetches
- [ ] Skeleton loading state
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 4 ✅
Commit: `feat: workspace overview dashboard with KPI cards and top performing assets`

---

## PHASE 5: AUTOMATIONS — PERFORMANCE WIZARD

**Goal:** Automations list page + full 4-step Performance Automation wizard with live preview.

### 5A. List Page

Header, "Create automation" dropdown (Performance/Competitor/Comments), filter tabs (All/Performance/Competitor/Comments with counts), automation cards (status badge, name, type badge, summary, SCHEDULE/PLATFORM/CLASSIFICATION/LAST UPDATED grid, metric tags, Edit/Pause/Test Run actions).

### 5B. 4-Step Wizard Modal

Large modal: header, progress bar, tab indicators (Basics | Groups | Notify | Schedule), left=form, right=LIVE PREVIEW, bottom nav.

**Step 1 — Basics:**
NAME (required), DESCRIPTION (optional), AGGREGATION LEVEL (Campaigns/Creatives/Headlines/Landing Pages/Copy), METRICS (tag multi-select: Spend/ROAS/Revenue/Purchases/LP Views/Impressions/CTR), TIME PERIODS (Yesterday orange / Today green / Last 7d teal toggles), SORT BY (metric + direction + period), CAMPAIGN CLASSIFICATION toggle (Critical ≤ 0.8, Top ≥ 2.0 thresholds)

**Step 2 — Groups & Filters (Optional):**
Entity filters ([field] [operator] [value]), metric filters, custom groups.

**Step 3 — Notifications:**
Platform cards: Slack (active) + WhatsApp (disabled, "Coming Soon"), Slack workspace dropdown, channel dropdown with refresh.

**Step 4 — Schedule:**
Frequency (Daily/Weekly), time picker, timezone notice, day-of-week pills (grayed when Daily), summary text, "Save & Test Run" + "Save Automation" buttons.

### 5C. Live Preview
Updates in real-time: title, classification groups, entity entries, metrics per time period, sort order. "Preview with sample data" footer.

### 5D. Save
POST /api/automations with Zod validation. Status: draft or active.

PostHog: `automations_page_viewed`, `create_automation_clicked`, `automation_wizard_step_completed`, `automation_wizard_abandoned`, `automation_created`, `automation_paused`, `automation_activated`

### VERIFY:
- [ ] List page shows seed automations with filter tabs
- [ ] "Create → Performance" opens wizard
- [ ] All Step 1 fields work (name, aggregation, metrics tags, periods, sort, classification)
- [ ] Step 2 entity/metric filter rows add/remove
- [ ] Step 3 Slack selected, WhatsApp "Coming Soon"
- [ ] Step 4 frequency, time, timezone, day selector work
- [ ] Preview updates live
- [ ] Save creates automation with correct JSON config
- [ ] Edit pre-populates wizard
- [ ] Pause/Activate toggles status
- [ ] PostHog events fire at each step
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 5 ✅
Commit: `feat: automations list and performance wizard with 4-step config and live preview`

---

## PHASE 6: AUTOMATIONS — COMPETITOR WIZARD

**Goal:** Competitor automation type reusing wizard shell from Phase 5.

Step 1: NAME, COMPETITOR BRAND NAME, META ADS LIBRARY URL (with helper box), DESCRIPTION, Scrape Settings (top N, impression period, started within).
Preview: mock competitor ads (numbered, runtime, format, "View in Ads Library").
Steps 2-4: reuse existing.
Scraper service: `lib/meta/ads-library.ts`

PostHog: `competitor_automation_created`, `competitor_scrape_completed`

### VERIFY:
- [ ] Competitor wizard opens, Step 1 has competitor fields + helper box
- [ ] Preview shows mock ads
- [ ] Save creates type='competitor' automation
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 6 ✅
Commit: `feat: competitor automation wizard with ad library scraper`

---

## PHASE 7: AUTOMATIONS — COMMENT DIGEST

**Goal:** Comment digest automation type.

Step 1: NAME, PAGES (multi-select, "{N} pages • {M} with Instagram"), POST FILTERS (organic/ad, age), FREQUENCY (1h/3h/6h/Daily).
Skip Step 2, reuse Steps 3-4.
Comment service: `lib/meta/comments.ts`

PostHog: `comment_automation_created`, `comments_fetched`

### VERIFY:
- [ ] Comment wizard with page selector
- [ ] Save creates type='comments' automation
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 7 ✅
Commit: `feat: comment digest automation with page monitoring`

---

## PHASE 8: SLACK BOT & EXECUTION ENGINE

**Goal:** Slack delivery + cron execution for all automation types.

### 8A. Slack OAuth at `/api/auth/slack/callback`
### 8B. Templates in `lib/slack/templates/`:
- **performance-digest.ts:** classification groups, metrics by period, color labels
- **competitor-report.ts:** numbered ads, details, thumbnails, "View in Ads Library"
- **comment-digest.ts:** grouped by page, individual comments, "View" buttons
- **landing-page-report.ts:** URL + metrics by period

### 8C. Executor — `lib/automations/executor.ts`
`executeAutomation(id)`: load → fetch data → format → send Slack → record run.

### 8D. Cron — `/api/webhooks/cron/automations`
### 8E. Test Run — `POST /api/automations/{id}/test-run` with "🧪 TEST RUN" prefix

PostHog: `automation_executed`, `automation_test_run`

### VERIFY:
- [ ] Slack OAuth connects
- [ ] All 4 digest types render correctly in Slack
- [ ] Test Run works
- [ ] Cron triggers due automations
- [ ] Runs recorded in automation_runs
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 8 ✅
Commit: `feat: Slack bot with all digest templates and execution engine`

---

## PHASE 9: REPORTS MODULE

**Goal:** 6 report pages with shared ReportLayout.

Shared: date range, column selector, sortable headers, CSV export, pagination.
Pages: Top Ads, Top Campaigns, Top Creatives, Top Landing Pages, Top Headlines, Top Copy.
"Create report" for custom reports.

PostHog: `report_viewed`, `report_sorted`, `report_exported`

### VERIFY:
- [ ] All 6 pages load, sort, paginate, export CSV
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 9 ✅
Commit: `feat: reports module with 6 report types and custom reports`

---

## PHASE 10: CAMPAIGN ANALYSIS

**Goal:** Deep-dive campaign page with Recharts and drill-down.

Campaign search, date presets, comparison mode, line/bar/scatter charts, expandable drill-down (campaign → ad set → ad), filters, CSV export.

PostHog: `campaign_analysis_viewed`, `campaign_drill_down`

### VERIFY:
- [ ] Charts render, drill-down works, filters narrow
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 10 ✅
Commit: `feat: campaign analysis with charts, drill-down, and comparison mode`

---

## PHASE 11: DISCOVER (AD LIBRARY BROWSER)

**Goal:** In-app Meta Ads Library browser.

Search bar (brand, active toggle, format, sort, per-page, pagination). 3-col grid cards (brand, runtime, "Live" badge, versions badge, media, format+date, name, copy, URL, platform icons, "Add to board"). Board selector popover flow.

PostHog: `discover_page_viewed`, `discover_search`, `ad_saved_to_board`

### VERIFY:
- [ ] Grid loads, search/filter/sort/pagination work
- [ ] Add to board saves correctly
- [ ] Responsive columns
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 11 ✅
Commit: `feat: discover feed with ad library browser and save to board`

---

## PHASE 12: BOARDS

**Goal:** Board list + detail pages with CRUD.

List: board cards, create dialog. Detail: title, "✨ Create Variations", format filter, ad grid with per-card "✨ Variations", pagination.
API: full CRUD for boards and board ads.

PostHog: `board_created`, `board_viewed`, `variation_triggered`

### VERIFY:
- [ ] List and detail work, CRUD works, Variations buttons present
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 12 ✅
Commit: `feat: boards with list, detail, CRUD operations`

---

## PHASE 13: ASSETS / PRODUCT CATALOG

**Goal:** Product catalog with image upload.

Grid, Add/Edit/Delete modals, image upload to Supabase Storage, search.

PostHog: `asset_created`, `asset_deleted`

### VERIFY:
- [ ] Product CRUD with image upload works
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 13 ✅
Commit: `feat: assets product catalog with image upload`

---

## PHASE 14: AI CREATIVE VARIATIONS

**Goal:** 6 variation strategies + generation + credits.

Modal: product selector (from Assets, validation), 2×3 strategy grid (Hero Product, Curiosity, Pain Point, Proof Point, Image Only, Text Only), credit cost, "✨ Generate".
Pipeline: prompt → OpenAI/DALL-E → save → deduct credits.
Results: original vs generated, download/copy.

PostHog: `variation_generation_started`, `variation_generation_completed`, `variation_downloaded`

### VERIFY:
- [ ] Modal opens, product selector works, validation blocks without image
- [ ] 6 strategies render, multi-select works
- [ ] Generation works (mock OK), credits deducted
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 14 ✅
Commit: `feat: AI creative variations with 6 strategies and credit system`

---

## PHASE 15: CHROME EXTENSION

**Goal:** Extension that injects save buttons into Meta Ad Library.

`/extension` directory with Manifest V3. Content script: connection banner, save buttons, board selector. Auth sync via chrome.storage.

### VERIFY:
- [ ] Loads in developer mode, injects on Ad Library, save-to-board works

Update PROGRESS.md → Phase 15 ✅
Commit: `feat: Chrome extension for Meta Ad Library integration`

---

## PHASE 16: POSTHOG DEEP INTEGRATION

**Goal:** Full analytics sweep with typed events.

`lib/analytics/events.ts` with 40+ typed events across auth, dashboard, automations, discover, boards, variations, reports, integrations, credits. User properties + workspace group. Sweep all components.

### VERIFY:
- [ ] All events firing, user identified, workspace grouped, no duplicates
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 16 ✅
Commit: `feat: comprehensive PostHog analytics with typed events`

---

## PHASE 17: CREDIT SYSTEM & BILLING

**Goal:** Credit balance, deductions, transactions, purchase flow.

Balance display, 10 credits/variation deduction, transaction history, insufficient balance handling, Stripe placeholder.

### VERIFY:
- [ ] Balance displayed, deduction works, history shows, insufficient blocks generation
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 17 ✅
Commit: `feat: credit system with balance, transactions, and purchase flow`

---

## PHASE 18: PRODUCTION HARDENING

**Goal:** Production-grade quality across everything.

Error boundaries, rate limiting, Zod on all routes, security headers, logging, next/image, accessibility, skeletons, empty states, toasts.

### VERIFY: Full audit of all routes, components, API endpoints.

Update PROGRESS.md → Phase 18 ✅
Commit: `feat: production hardening — errors, rate limiting, validation, security, a11y`

---

## PHASE 19: TESTING & QA

**Goal:** >80% coverage.

Unit (Vitest): utils, schemas, templates, calculations. Integration: API routes, execution pipeline. E2E (Playwright): auth, dashboard, automations, discover→board→variation, reports.

### VERIFY:
- [ ] `npm test` passes, `npm run test:e2e` passes, coverage >80% on lib/

Update PROGRESS.md → Phase 19 ✅
Commit: `test: comprehensive unit, integration, and E2E test suite`

---

## PHASE 20: DEPLOYMENT & CI/CD

**Goal:** Ship to production.

Vercel: config + crons (sync every 6h, automations every 5min). Supabase: production RLS + migrations + storage. GitHub Actions: lint/test on PR, deploy on merge. Monitoring: PostHog dashboards, Vercel analytics, Sentry.

### VERIFY:
- [ ] Production deployed, crons running, CI/CD pipeline works, Lighthouse >90

Update PROGRESS.md → Phase 20 ✅
Commit: `chore: deployment configuration, CI/CD pipeline, monitoring`

---

## APPENDIX: TECH STACK REFERENCE

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router) | Full-stack React framework |
| UI | Tailwind CSS + shadcn/ui | Component library |
| Auth | Supabase Auth | Email/password + OAuth |
| Database | Supabase (Postgres) | Primary data store |
| ORM | Drizzle ORM | Type-safe SQL |
| Storage | Supabase Storage | Images, media |
| Meta API | Marketing API v21.0 | Ad account data |
| Ad Library | Meta Ads Library | Competitor intelligence |
| Slack | Slack Web API | Digest delivery |
| AI Text | OpenAI GPT-4o / Claude | Creative text generation |
| AI Image | DALL-E 3 / Stable Diffusion | Creative image generation |
| Analytics | PostHog | Product analytics + feature flags |
| Charts | Recharts | Data visualization |
| Testing | Vitest + Playwright | Unit + E2E |
| Deployment | Vercel + Supabase Cloud | Hosting + serverless |
| CI/CD | GitHub Actions | Automated pipeline |
| Extension | Chrome Manifest V3 | Ad Library integration |
