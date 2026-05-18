# GLUED — Complete Build Plan for Claude Code (Ralph Loop Protocol)

> **What this file is:** A step-by-step implementation plan designed to be fed to Claude Code, one phase at a time, using the Ralph Loop methodology. Each phase implements a discrete feature, verifies it, commits, and stops — preventing context rot and ensuring quality across the entire build.

> **How to use it:** Copy the CLAUDE.md and PROGRESS.md templates into your project root first. Then, for each phase, paste the prompt into a fresh Claude Code session. Claude Code reads CLAUDE.md for project context and PROGRESS.md to know where you left off. After each phase completes and passes verification, start a NEW session for the next phase.

---

## TABLE OF CONTENTS

| Phase | Feature | Estimated Effort |
|-------|---------|-----------------|
| 0 | Project Bootstrap + CLAUDE.md + PROGRESS.md | 30 min |
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

# STEP 0: PROJECT BOOTSTRAP

## 0A. Create the project

Paste into Claude Code:

```
Create a new Next.js 15 project called "glued" with App Router, TypeScript, Tailwind CSS, and the following setup:

1. npx create-next-app@latest glued --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
2. cd glued
3. Install dependencies:
   npm install @supabase/supabase-js @supabase/ssr drizzle-orm drizzle-kit postgres posthog-js posthog-node recharts lucide-react class-variance-authority clsx tailwind-merge date-fns zod zustand @slack/web-api
   npx shadcn@latest init (select: New York style, Zinc color, CSS variables: yes)
   npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet sidebar tabs textarea toast toggle tooltip badge avatar command popover calendar table switch progress skeleton scroll-area

4. Set up project structure:
   src/
   ├── app/
   │   ├── (auth)/          # Login, signup pages
   │   ├── (dashboard)/     # Main app pages (protected)
   │   │   ├── layout.tsx   # Dashboard layout with sidebar
   │   │   ├── home/
   │   │   ├── automations/
   │   │   ├── campaign-analysis/
   │   │   ├── discover/
   │   │   ├── boards/
   │   │   ├── assets/
   │   │   └── reports/
   │   ├── api/             # API routes
   │   └── layout.tsx       # Root layout
   ├── components/
   │   ├── ui/              # shadcn components
   │   ├── layout/          # Sidebar, Header, etc.
   │   └── shared/          # Reusable components
   ├── lib/
   │   ├── supabase/        # Supabase clients
   │   ├── meta/            # Meta API integration
   │   ├── slack/            # Slack integration
   │   ├── ai/              # AI generation
   │   ├── analytics/       # PostHog
   │   └── utils/           # Helpers
   ├── db/
   │   ├── schema.ts        # Drizzle schema
   │   └── migrations/
   └── types/               # TypeScript types

5. Create .env.local template:
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

6. Initialize git: git init && git add . && git commit -m "chore: initial project setup"

Now create the CLAUDE.md and PROGRESS.md files as specified below.
```

## 0B. Create CLAUDE.md

This file lives at the project root and gives Claude Code context for every session.

```
Create a file called CLAUDE.md in the project root with this exact content:
```

````markdown
# CLAUDE.md — Glued Project Intelligence

## What is Glued?
Glued is a SaaS platform that unifies Meta (Facebook/Instagram) advertising analytics, competitor intelligence, automated reporting, social comment monitoring, and AI-powered creative generation into a single workspace. Think of it as "Supermetrics + AdSpy + Jasper" combined into one platform.

## Tech Stack
- **Framework:** Next.js 15 (App Router, Server Components, Route Handlers)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (Postgres) with Drizzle ORM
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **File Storage:** Supabase Storage (product images, ad media, variation outputs)
- **Integrations:** Meta Marketing API v21.0, Meta Ads Library, Slack Web API
- **AI:** OpenAI GPT-4o (text), DALL-E 3 or Stable Diffusion (images)
- **Analytics:** PostHog (client + server, group analytics by workspace)
- **Charts:** Recharts
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Deployment:** Vercel + Supabase Cloud
- **Extension:** Chrome Manifest V3

## Architecture Principles
1. **Server Components by default** — only use `"use client"` when interactivity is needed
2. **Server Actions for mutations** — prefer over API routes for form submissions
3. **API Routes for webhooks & external integrations** — Slack, Meta, Cron
4. **Drizzle ORM with typed schemas** — no raw SQL except for complex aggregations
5. **Zod validation on all inputs** — API routes and server actions
6. **PostHog everywhere** — every user action, every API call, every error
7. **Workspace-scoped data** — EVERY database query must filter by workspace_id
8. **Supabase RLS enabled** — Row Level Security as the last line of defense
9. **Error boundaries** — React error boundaries on every page
10. **Loading states** — skeleton loaders on all data-fetching components

## Key Domain Concepts
- **Workspace:** Top-level container. Users belong to workspaces. All data is workspace-scoped.
- **Ad Account:** Meta ad account connected via OAuth. A workspace has many ad accounts (up to 91+).
- **Automation:** A scheduled task that fetches data, formats it, and delivers to Slack. Three types: Performance, Competitor, Comments.
- **Board:** A collection of saved ads for creative inspiration (swipe file).
- **Asset:** A product in the workspace catalog, used for AI variation generation.
- **Variation:** AI-generated ad creative based on a competitor ad + your product + a strategy.
- **Credit:** Currency for AI features. Deducted on variation generation.

## File Conventions
- `page.tsx` — Next.js page component (server component by default)
- `layout.tsx` — Layout wrapper
- `loading.tsx` — Loading skeleton for the page
- `error.tsx` — Error boundary for the page
- `actions.ts` — Server actions for the page
- `components/` — Page-specific components (co-located)
- Components that need interactivity: use `"use client"` directive

## Database Naming
- Tables: snake_case plural (workspaces, automations, boards, saved_ads)
- Columns: snake_case (workspace_id, created_at, last_synced_at)
- Foreign keys: {referenced_table_singular}_id (workspace_id, automation_id)
- Timestamps: created_at, updated_at (auto-managed by triggers)
- Soft deletes: deleted_at (nullable timestamp)

## PostHog Conventions
- Use `posthog.capture('event_name', { properties })` client-side
- Use server-side PostHog client for API routes and background jobs
- Event names: snake_case (automation_created, board_viewed)
- Always include workspace_id and user_id in events
- Group analytics by workspace using posthog.group('workspace', workspace_id)
- Track timing for operations using duration_ms property

## Testing Conventions
- Unit tests: `*.test.ts` co-located with source files
- E2E tests: `tests/e2e/*.spec.ts`
- Use `describe` blocks grouped by feature
- Test both happy path and error cases
- Mock external APIs (Meta, Slack, AI) in tests

## IMPORTANT RULES
1. **NEVER skip TypeScript types** — every function, every component, every API response
2. **NEVER hardcode workspace_id** — always derive from auth session
3. **ALWAYS check PROGRESS.md** before starting work — know where you are
4. **ALWAYS update PROGRESS.md** after completing a phase
5. **ALWAYS commit after each phase** with conventional commit message
6. **NEVER proceed to next phase without verification** — run checks first
7. **Use environment variables** for all secrets and configuration
8. **Handle errors gracefully** — never let errors crash the app silently
````

## 0C. Create PROGRESS.md

```
Create a file called PROGRESS.md in the project root with this exact content:
```

````markdown
# PROGRESS.md — Build Progress Tracker

> Last updated: [DATE]
> Current phase: Phase 0 ✅

## Phase Status

| Phase | Feature | Status | Date | Notes |
|-------|---------|--------|------|-------|
| 0 | Project Bootstrap | ✅ Complete | | Initial setup |
| 1 | Auth & Workspace System | ⬜ Not started | | |
| 2 | Database Schema & Seed Data | ⬜ Not started | | |
| 3 | Sidebar Navigation & Layout | ⬜ Not started | | |
| 4 | Workspace Overview Dashboard | ⬜ Not started | | |
| 5 | Automations — Performance Wizard | ⬜ Not started | | |
| 6 | Automations — Competitor Wizard | ⬜ Not started | | |
| 7 | Automations — Comment Digest | ⬜ Not started | | |
| 8 | Slack Bot & Execution Engine | ⬜ Not started | | |
| 9 | Reports Module | ⬜ Not started | | |
| 10 | Campaign Analysis | ⬜ Not started | | |
| 11 | Discover (Ad Library Browser) | ⬜ Not started | | |
| 12 | Boards (Swipe Files) | ⬜ Not started | | |
| 13 | Assets / Product Catalog | ⬜ Not started | | |
| 14 | AI Creative Variations | ⬜ Not started | | |
| 15 | Chrome Extension | ⬜ Not started | | |
| 16 | PostHog Deep Integration | ⬜ Not started | | |
| 17 | Credit System & Billing | ⬜ Not started | | |
| 18 | Production Hardening | ⬜ Not started | | |
| 19 | Testing & QA | ⬜ Not started | | |
| 20 | Deployment & CI/CD | ⬜ Not started | | |

## Issues / Blockers

(None yet)

## Context for Next Session

(Notes from last session to carry forward)
````

Commit: `chore: project bootstrap with CLAUDE.md and PROGRESS.md`

---

# PHASE 1: AUTH & WORKSPACE SYSTEM

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 0 is complete.

TASK: Build the authentication and workspace system.

## 1A. Supabase Auth Setup

Configure Supabase Auth:
- Email/password signup and login
- Google OAuth provider (optional, can be added later)
- Auth middleware in src/lib/supabase/middleware.ts
- Protected routes: everything under (dashboard)/ requires auth
- Public routes: (auth)/login, (auth)/signup

Create Supabase clients:
- src/lib/supabase/client.ts — browser client (for client components)
- src/lib/supabase/server.ts — server client (for server components and server actions)
- src/middleware.ts — refresh auth tokens on every request

## 1B. Auth Pages

(auth)/login/page.tsx:
- Email + password form
- "Don't have an account? Sign up" link
- Google OAuth button (styled but can be disabled if no Google OAuth configured)
- Clean, centered card layout with Glued branding

(auth)/signup/page.tsx:
- Email + password + workspace name
- On signup: create user → create workspace → redirect to /home
- "Already have an account? Log in" link

## 1C. Workspace Model

Database table: workspaces
- id: uuid (pk, default gen_random_uuid())
- name: text (not null)
- slug: text (unique, generated from name)
- timezone: text (default 'UTC')
- currency: text (default 'USD')
- credit_balance: integer (default 100)
- meta_access_token: text (nullable, encrypted)
- slack_team_id: text (nullable)
- slack_access_token: text (nullable)
- slack_team_name: text (nullable)
- settings: jsonb (default '{}')
- created_at: timestamptz
- updated_at: timestamptz

Database table: workspace_members
- id: uuid (pk)
- workspace_id: uuid (fk → workspaces.id)
- user_id: uuid (fk → auth.users.id)
- role: text ('owner', 'admin', 'member')
- created_at: timestamptz

## 1D. Workspace Context

Create a WorkspaceProvider context:
- src/lib/hooks/use-workspace.ts
- Fetches current user's workspace from database
- Makes workspace_id available to all child components
- Server-side: getWorkspace() helper that reads from auth session

## 1E. PostHog Initialization

src/lib/analytics/posthog-provider.tsx:
- PostHogProvider wrapping the app
- Identify user on login: posthog.identify(userId, { email, name })
- Group by workspace: posthog.group('workspace', workspaceId, { name, plan })
- Page view tracking (automatic with Next.js integration)

PostHog events:
- `user_signed_up` with { workspace_name }
- `user_logged_in`
- `user_logged_out`

## VERIFY:
- [ ] Signup creates user and workspace in database
- [ ] Login redirects to /home
- [ ] Unauthenticated users redirected to /login
- [ ] WorkspaceProvider provides workspace context
- [ ] PostHog identifies user and groups by workspace
- [ ] Logout clears session and redirects to /login
- [ ] TypeScript compiles with no errors: `npx tsc --noEmit`
- [ ] App runs without errors: `npm run dev`

Update PROGRESS.md: Phase 1 → ✅ Complete
Commit: `feat: auth system with workspace creation and PostHog identification`
```

---

# PHASE 2: DATABASE SCHEMA & SEED DATA

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 1 is complete.

TASK: Create the complete database schema and seed data for development.

## 2A. Drizzle Schema (src/db/schema.ts)

Define ALL tables needed for the entire application. This upfront schema design prevents migration headaches later.

### Tables:

**workspaces** (already created in Phase 1, add any missing columns)

**ad_accounts**
- id, workspace_id (fk), meta_account_id (text, unique), name, currency, timezone, status ('active'|'paused'|'disconnected'), last_synced_at, created_at, updated_at

**campaigns**
- id, workspace_id (fk), ad_account_id (fk), meta_campaign_id (text), name, status, objective, daily_budget, lifetime_budget, created_at, updated_at

**campaign_metrics** (daily snapshots)
- id, campaign_id (fk), date (date), spend (decimal), revenue (decimal), roas (decimal), impressions (integer), clicks (integer), ctr (decimal), purchases (integer), landing_page_views (integer), created_at

**creatives**
- id, workspace_id (fk), campaign_id (fk), meta_creative_id (text), name, headline, body, landing_page_url, image_url, video_url, format ('image'|'video'|'carousel'), status, created_at, updated_at

**creative_metrics** (daily snapshots)
- id, creative_id (fk), date, spend, revenue, roas, impressions, clicks, ctr, purchases, landing_page_views, created_at

**automations**
- id, workspace_id (fk), name, description, type ('performance'|'competitor'|'comments'), status ('active'|'paused'|'draft'), config (jsonb — stores all wizard configuration), schedule (jsonb — frequency, time, days, timezone), delivery (jsonb — platform, channel, workspace), classification (jsonb — enabled, critical_threshold, top_threshold), last_run_at, created_at, updated_at

**automation_runs**
- id, automation_id (fk), status ('success'|'failed'|'partial'), started_at, completed_at, items_count (integer), error_message (text nullable), metadata (jsonb)

**boards**
- id, workspace_id (fk), name, description, created_at, updated_at

**saved_ads**
- id, board_id (fk), workspace_id (fk), source ('discover'|'extension'|'competitor'), meta_library_id (text), brand_name, headline, body, format ('image'|'video'|'carousel'), image_url, video_url, landing_page_url, platforms (text[]), start_date (date nullable), runtime_days (integer nullable), metadata (jsonb), created_at

**assets** (products)
- id, workspace_id (fk), name, description, image_url (text not null), metadata (jsonb), created_at, updated_at

**variations**
- id, workspace_id (fk), saved_ad_id (fk), asset_id (fk), strategy ('hero_product'|'curiosity'|'pain_point'|'proof_point'|'image_only'|'text_only'), generated_image_url, generated_headline, generated_body, credits_used (integer), status ('pending'|'completed'|'failed'), created_at

**credit_transactions**
- id, workspace_id (fk), amount (integer, positive=credit, negative=debit), type ('purchase'|'variation'|'bonus'|'refund'), reference_id (uuid nullable), description, created_at

**competitor_brands**
- id, workspace_id (fk), name, meta_ads_library_url, description, last_scraped_at, created_at, updated_at

**facebook_pages**
- id, workspace_id (fk), page_id (text), page_name, has_instagram (boolean), instagram_handle (text nullable), access_token (text), created_at

**comments**
- id, workspace_id (fk), page_id (fk → facebook_pages.id), post_id (text), commenter_name, commenter_id (text), comment_text, comment_time (timestamptz), post_type ('organic'|'ad'), is_read (boolean default false), created_at

## 2B. Drizzle Config & Migration

- drizzle.config.ts pointing to Supabase
- Generate migration: `npx drizzle-kit generate`
- Apply migration: `npx drizzle-kit push` (for dev) or `npx drizzle-kit migrate` (for prod)

## 2C. Seed Data Script

Create scripts/seed.ts that populates development data:
- 1 workspace ("Glued Demo", timezone: Asia/Hong_Kong, currency: HKD)
- 91 ad accounts with names
- 50 campaigns across accounts with realistic names (Summer_Sale_2024, Brand_Awareness, etc.)
- 30 days of campaign_metrics with realistic data (spend: $100-$5000/day, ROAS: 0.5-5x)
- 20 creatives with placeholder image URLs
- 30 days of creative_metrics
- 5 sample automations (3 performance, 1 competitor, 1 comment digest) with varied statuses
- 1 board ("huel") with 2 saved ads
- 2 assets (products with placeholder images)
- 48 facebook_pages with instagram indicators
- Sample comments
- Add `npm run seed` script to package.json

PostHog event: `seed_data_generated` (server-side)

## VERIFY:
- [ ] All tables created in Supabase: check via Supabase dashboard or psql
- [ ] `npm run seed` populates all tables with realistic data
- [ ] Drizzle can query all tables: write a quick test query for each
- [ ] Foreign key relationships work correctly
- [ ] TypeScript types inferred from Drizzle schema are correct
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md: Phase 2 → ✅ Complete
Commit: `feat: complete database schema with Drizzle ORM and seed data`
```

---

# PHASE 3: SIDEBAR NAVIGATION & LAYOUT SHELL

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 2 is complete.

TASK: Build the dashboard layout with collapsible sidebar navigation matching Glued's exact UI.

## 3A. Dashboard Layout — (dashboard)/layout.tsx

Server component that:
1. Checks auth (redirect to /login if not authenticated)
2. Fetches workspace data
3. Renders sidebar + main content area
4. Wraps children in WorkspaceProvider

## 3B. Sidebar Component — components/layout/sidebar.tsx

"use client" component. Must match Glued's sidebar exactly:

**Top Section:**
- Workspace name with avatar ("G" icon, green circle), dropdown chevron for workspace switcher
- Layout toggle icon (grid/list view)

**Navigation Items:**
- 🏠 Home → /home
- ⚡ Automations → /automations
- 📊 Campaign Analysis → /campaign-analysis
- 🔍 Discover → /discover
- 📋 Boards → /boards
- 🖼 Assets → /assets
- ➕ Create report → (action/modal)

**REPORTS Section Header:**
- 📈 Top Ads → /reports/top-ads
- 📊 Top Campaigns → /reports/top-campaigns
- 🎨 Top Creatives → /reports/top-creatives
- 🔗 Top Landing Pages → /reports/top-landing-pages
- T Top Headlines → /reports/top-headlines
- 99 Top Copy → /reports/top-copy

**FOLDERS Section Header:**
- ➕ button to create folder
- (Empty initially)

**Bottom:**
- User avatar with name, dropdown for settings/logout

Active state: green left border bar + bold text + subtle background

## 3C. Top Bar

For each page, a consistent top bar with:
- Meta icon + workspace sync icon
- Refresh button
- Page-specific actions (e.g., "Create automation" dropdown on automations page)

## 3D. PostHog Navigation Tracking

Track sidebar navigation:
- `sidebar_nav_clicked` with { destination, current_page }

## VERIFY:
- [ ] Sidebar renders with all navigation items in correct order
- [ ] Active page highlighted with green left border
- [ ] Clicking nav items navigates to correct routes
- [ ] All routes render placeholder pages (just <h1>Page Name</h1>)
- [ ] Workspace name shown in sidebar header
- [ ] User avatar and name shown at bottom
- [ ] Logout works from user dropdown
- [ ] Responsive: sidebar collapses on mobile
- [ ] PostHog tracks navigation
- [ ] TypeScript compiles

Update PROGRESS.md: Phase 3 → ✅ Complete
Commit: `feat: dashboard layout with sidebar navigation matching Glued UI`
```

---

# PHASE 4: WORKSPACE OVERVIEW DASHBOARD

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 3 is complete.

TASK: Build the Home dashboard page at (dashboard)/home/page.tsx matching Glued's exact layout.

## 4A. Page Header

- "Workspace Overview" H1
- "Last synced (Asia/Hong_Kong): 12 Feb 2026, 22:54" subtitle
- Meta API icon (two interconnected rings icon) + Refresh button (top-right)
- "Overall metrics for 91 Meta ad accounts" subtitle text

## 4B. KPI Summary Cards

Three horizontal cards in a responsive row:

**Revenue Card:**
- $ icon (green circle)
- "Revenue" label
- % change indicator (red down arrow for decrease, green up arrow for increase) e.g., "↓ -82.0%"
- Primary value: e.g., "HK$300k"
- "Today" period label
- Mini horizontal bar chart comparing Today vs Yesterday
- Bottom: YESTERDAY value | LAST 7 DAYS value

**Spend Card:**
- Wallet icon
- "Spend" label
- Same structure as Revenue

**Profit Card:**
- Trend icon with "65% margin" label
- "Profit" label
- Same structure as Revenue

Data source: aggregate campaign_metrics across all ad_accounts for the workspace.
Calculate Today, Yesterday, Last 7 Days for each metric.
Derive profit = revenue - spend. Margin = profit/revenue * 100.

## 4C. Top Performing Assets Section

- ⚡ "Top Performing Assets" header with sparkle icon
- "Hello-Nancy-22: Metrics are based on last 7 days" subtitle (workspace context)

**Tab Bar:** Creatives | Headlines | Copy | Landing Pages

**Creatives Tab (default):**
Horizontal scrolling row of creative cards. Each card:
- Thumbnail image with "IMAGE" badge overlay (top-left)
- "Creative N" label below image
- ROAS: e.g., 2.40x
- SPEND: e.g., HK$207k
- IMPRESSIONS: e.g., 1,190,126

Data: query creative_metrics, sort by ROAS desc, limit 10, last 7 days.

**Headlines Tab:**
- Same card structure but showing headline text instead of image
- Metrics: ROAS, Spend, Impressions

**Copy Tab:**
- Show truncated body copy
- Same metrics

**Landing Pages Tab:**
- Show landing page URL
- Same metrics plus CTR

## 4D. Data Fetching

Server component with server-side data fetching:
- getWorkspaceKPIs(workspaceId, timezone) → { today, yesterday, last7d } for spend, revenue, profit
- getTopCreatives(workspaceId, period='7d', limit=10)
- getTopHeadlines(workspaceId, period='7d', limit=10)
- getTopCopy(workspaceId, period='7d', limit=10)
- getTopLandingPages(workspaceId, period='7d', limit=10)

## 4E. PostHog Events

- `dashboard_loaded` with { account_count, total_spend_today, total_revenue_today }
- `top_assets_tab_switched` with { tab: 'creatives'|'headlines'|'copy'|'landing_pages' }
- `refresh_clicked` with { page: 'home' }

## VERIFY:
- [ ] Dashboard loads with 3 KPI cards showing correct aggregate data
- [ ] KPI cards show Today, Yesterday, Last 7 Days values
- [ ] % change arrows are color-coded (red for decrease, green for increase)
- [ ] Mini bar charts render
- [ ] Tab bar switches between Creatives, Headlines, Copy, Landing Pages
- [ ] Creative cards show thumbnails, ROAS, Spend, Impressions
- [ ] Horizontal scroll works on creative cards
- [ ] Refresh button triggers data refresh
- [ ] Data matches seed data calculations
- [ ] PostHog events fire
- [ ] Loading skeleton shows while data loads
- [ ] TypeScript compiles

Update PROGRESS.md: Phase 4 → ✅ Complete
Commit: `feat: workspace overview dashboard with KPI cards and top performing assets`
```

---

# PHASE 5: AUTOMATIONS — PERFORMANCE WIZARD

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 4 is complete.

TASK: Build the Automations list page and the 4-step Performance Automation creation wizard.

## 5A. Automations List Page — (dashboard)/automations/page.tsx

Header: "Automations" with subtitle "Configure recurring campaign digests with guardrails, schedule, and delivery platform."

**Top-right actions:**
- Meta icon + sync indicator
- Reload button
- "Create automation" green dropdown button with chevron → menu: Performance, Competitor, Comments

**Filter Tab Bar:**
- All (count) | Performance (count) | Competitor (count) | Comments (count)
- Each tab shows the count of automations of that type
- Click filters the list

**Automation Cards (list view):**
Each card displays:
- Status badge: "Active" (green), "Draft" (gray), "Paused"
- Automation name (bold) + type badge (blue "Performance", orange "Competitor", green "Comments")
- Summary line: "Weekly • spend, roas, revenue, purchase_count"
- Details grid:
  - SCHEDULE: frequency + day + time + timezone
  - PLATFORM: Slack + template name + channel
  - CLASSIFICATION: On/Off + type
  - LAST UPDATED: timestamp
- Metric tags row: spend, roas, revenue, purchase_count (as small badges)
- Action buttons: Edit, Pause/Activate, Test Run

## 5B. 4-Step Performance Wizard Modal

Opens in a large modal. Structure:
- Header: "Create Automation" + green hint: "Watch the preview on the right to see changes"
- Progress bar: Step N of 4: {Step Name}
- Tab indicators: Basics | Groups | Notify | Schedule (with progress coloring)
- Left panel: configuration form
- Right panel: LIVE PREVIEW with sample data (updates as user changes options)
- Bottom: Previous / Skip / Next / Save buttons

### Step 1: Basics

```
NAME — text input (required) with AI suggestion icon (speech bubble dots)
DESCRIPTION (optional) — textarea, placeholder: "Optional summary shown to teammates."
AGGREGATION LEVEL — dropdown:
  - Campaigns (default): "Reports metrics for each campaign"
  - Creatives: "Reports metrics for each creative"
  - Headlines: "Reports metrics for each headline"
  - Landing Pages: "Reports metrics for each landing page"
  - Copy: "Reports metrics for each copy variation"
METRICS — tag-based multi-select with "+ Add metric" button
  Available: Spend, ROAS, Revenue, Purchase count, Landing page views, Impressions, CTR
  Each selected metric shows as a numbered tag with X to remove (e.g., "1 Spend ✕")
TIME PERIODS — toggle pills: Yesterday (orange), Today (green), Last 7 Days (teal)
  Default: all three selected
SORT BY (optional) — three-part control:
  - Sort metric: dropdown (No sorting, or any of selected metrics)
  - Direction: dropdown (High to Low, Low to High)
  - Period: dropdown (All periods (total), Yesterday, Today, Last 7 Days)
CAMPAIGN CLASSIFICATION — toggle switch
  Description: "Group campaigns by today's ROAS into Top, Underperforming, and Critical."
  When ON, show two threshold inputs:
  - 🔴 Critical at or below: number input (default: 0.8)
  - 🟢 Top at or above: number input (default: 2.0)
```

### Step 2: Groups & Filters (Optional)

```
Header: "Filters & Groups" with "Optional" badge
Description: "Filter data before grouping, then combine items under custom labels."

FILTERS section:
  "By entity" label
  - Row: [Campaign name ▼] [contains ▼] [Type value] [🗑]
  - "+ Add entity filter" button

  "By metric" label
  - Hint: "Try: ROAS greater than 2.5 to show only high-performing items"
  - "+ Add metric filter" button

CUSTOM GROUPS section:
  - "No groups yet. Try: 'Summer Sale' containing 'summer'"
  - "+ Add group" button

Navigation: Previous, Skip, Next
```

### Step 3: Notifications

```
Header: "Notification Delivery"
Description: "Choose where to receive your automated digest."

DELIVERY PLATFORM — card selector (large clickable cards):
  - Slack card (selected, blue border): Slack icon + "Send digests to a Slack channel."
  - WhatsApp card (disabled, grayed): WhatsApp icon + "Deliver summaries to WhatsApp." + "Coming Soon" badge

SLACK WORKSPACE — dropdown populated from connected Slack workspaces (e.g., "Agentiwise")
SLACK CHANNEL — dropdown with "↻ Refresh channels" link
  - Populated from Slack API based on selected workspace
```

### Step 4: Schedule

```
FREQUENCY — dropdown: Daily, Weekly
SEND TIME — time picker (e.g., "09:00 AM") with clock icon
Timezone notice: "Timezone: Asia/Hong_Kong. Times are in your workspace's timezone. UTC conversion is saved automatically."
DAYS OF THE WEEK — pill buttons: Mon, Tue, Wed, Thu, Fri, Sat, Sun
  - Grayed out with "(not applicable for daily)" when frequency is Daily
  - Selectable when frequency is Weekly (e.g., THU selected)
SCHEDULE SUMMARY — auto-text: "Your digest will be sent every day at 9:00 AM (Asia/Hong_Kong)."

Actions: "Save & Test Run" (secondary), "Save Automation" (primary green)
```

## 5C. Live Preview Panel

Right side of wizard showing formatted preview:
- Title at top (automation name)
- Campaign classification grouping if enabled (🟢 Top performing, ⚪ Underperforming, 🔴 Critical)
- For each campaign: name, then time period sections (Yesterday, Today, Last 7d)
- Metrics per period matching selected metrics
- "Preview with sample data" footer

Updates in REAL TIME as user:
- Changes aggregation level (campaigns vs creatives vs headlines...)
- Adds/removes metrics
- Toggles time periods
- Changes classification thresholds
- Changes sort order

## 5D. Save Logic

POST /api/automations:
- Validates all fields with Zod
- Saves to automations table with config, schedule, delivery JSON columns
- Sets status based on button: 'draft' for Save, 'active' for Save & Test Run
- If Test Run: immediately executes and sends to Slack

## 5E. PostHog Events

- `automations_page_viewed` with { total, active, paused, draft }
- `create_automation_clicked` with { type: 'performance' }
- `automation_wizard_step_completed` with { step: 1|2|3|4, type: 'performance' }
- `automation_created` with { type, aggregation, metrics, frequency, has_classification }
- `automation_paused` with { automation_id }
- `automation_activated` with { automation_id }

## VERIFY:
- [ ] Automations list page loads showing all automations from seed data
- [ ] Filter tabs work (All, Performance, Competitor, Comments)
- [ ] Each automation card shows correct details (schedule, platform, classification, metrics)
- [ ] "Create automation" dropdown shows three type options
- [ ] Clicking "Performance" opens the 4-step wizard modal
- [ ] Step 1: all fields render and work (name, description, aggregation, metrics, time periods, sort, classification)
- [ ] Step 2: entity and metric filters render, add/remove works
- [ ] Step 3: Slack selected, WhatsApp disabled with "Coming Soon"
- [ ] Step 4: frequency, time, timezone, day selector all work
- [ ] Preview panel updates in real-time as configuration changes
- [ ] Progress bar and tab indicators update per step
- [ ] Save creates automation in database
- [ ] Edit button pre-populates wizard with existing automation config
- [ ] Pause/Activate toggles automation status
- [ ] PostHog events fire at each step
- [ ] TypeScript compiles

Update PROGRESS.md: Phase 5 → ✅ Complete
Commit: `feat: automations list page and performance automation 4-step wizard with live preview`
```

---

# PHASE 6: AUTOMATIONS — COMPETITOR WIZARD

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 5 is complete.

TASK: Build the Competitor Automation creation wizard, reusing the wizard shell from Phase 5.

## 6A. Competitor-Specific Step 1: Basics

Same wizard shell but different header and fields:
- Header: "Create Competitor Automation"
- Subtitle: "Track competitor ads from Meta Ads Library"

Fields:
1. NAME — text input
2. COMPETITOR BRAND NAME — text input (placeholder: "e.g., Nike"), help: "The brand name will appear in your reports"
3. META ADS LIBRARY URL — URL input with placeholder: "https://www.facebook.com/ads/library/?view_all_page_id=123456789"
   Help: "Go to Meta Ads Library, search for the brand, and copy the URL"
4. DESCRIPTION (optional) — textarea
5. Helper box titled "How to find the Meta Ads Library URL" with 4 numbered steps
6. Scrape Settings (stored in config JSON): top N ads (default 10), impression period dropdown (Last 7/14/30 days), started within period toggle

## 6B. Competitor Preview Panel

Shows mock scraped ads: numbered (#1, #2, #3), each with runtime (days), started date, format, platforms, headline, "View in Ads Library ↗", "+ 7 more ads...", scraped timestamp, mock data disclaimer.

## 6C. Steps 2-4 reuse existing components.

## 6D. Meta Ads Library Scraper Service

Create lib/meta/ads-library.ts — function to scrape/fetch competitor ads from Meta Ads Library.

PostHog: `competitor_automation_created`, `competitor_scrape_completed`

VERIFY:
- [ ] Competitor wizard opens from Create automation → Competitor
- [ ] Step 1 has competitor fields (brand name, URL, scrape settings)
- [ ] Helper box with instructions renders
- [ ] Preview shows mock competitor ads
- [ ] Steps 2-4 reuse existing components
- [ ] Save creates type='competitor' automation
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 6 ✅
Commit: `feat: competitor automation wizard with ad library scraper`
```

---

# PHASE 7: AUTOMATIONS — COMMENT DIGEST

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 6 is complete.

TASK: Build the Comment Digest automation type.

Comment-specific Step 1 fields:
- NAME, PAGES (multi-select connected Facebook pages showing "{N} pages • {M} with Instagram"), POST FILTERS (organic/ad toggles, post age dropdown), FREQUENCY (1h/3h/6h/Daily)
- Skip Step 2 (Groups), go directly to Notify and Schedule

Create lib/meta/comments.ts for fetching new comments.

PostHog: `comment_automation_created`, `comments_fetched`

VERIFY:
- [ ] Comment wizard renders with page selector
- [ ] Save creates type='comments' automation
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 7 ✅
Commit: `feat: comment digest automation with page monitoring`
```

---

# PHASE 8: SLACK BOT & EXECUTION ENGINE

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 7 is complete.

TASK: Build the Slack Bot (Glued Bot) delivery system and automation execution engine.

## 8A. Slack OAuth

OAuth flow at /api/auth/slack/callback. Scopes: chat:write, channels:read. Store tokens in workspace.

## 8B. Slack Message Templates (lib/slack/templates/)

**performance-digest.ts:** Classification groups (🟢/⚪/🔴), campaign names, collapsible time periods (Yesterday/Today/Last 7d), color-coded metric labels.

**competitor-report.ts:** "{Brand} - Top Ads Report", applied checks summary, numbered ad entries (1️⃣2️⃣3️⃣) with headline, details, format, runtime, "View in Ads Library" link, thumbnails.

**comment-digest.ts:** "📁 Comment Digest", count/pages, per-page grouping, individual comments with commenter name, time, text, "View" button.

**landing-page-report.ts:** URL links, three time periods, Spend/ROAS/Revenue/CTR/Impressions.

## 8C. Execution Engine (lib/automations/executor.ts)

executeAutomation(id): load config → fetch data → format → send to Slack → record run.
Cron at /api/webhooks/cron/automations: query due automations, execute each, handle failures.

## 8D. Test Run

POST /api/automations/{id}/test-run: execute with "🧪 TEST RUN" prefix.

PostHog: `automation_executed`, `automation_test_run`

VERIFY:
- [ ] Slack OAuth connects
- [ ] Performance/Competitor/Comment/Landing Page digests render correctly in Slack
- [ ] Test Run sends message
- [ ] Cron triggers automations
- [ ] Runs recorded in automation_runs table
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 8 ✅
Commit: `feat: Slack bot with all digest templates and execution engine`
```

---

# PHASE 9: REPORTS MODULE

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 8 is complete.

TASK: Build 6 report pages under (dashboard)/reports/.

Shared <ReportLayout>: title, date range selector, metric column selector, sortable column headers, CSV export, pagination.

Pages: top-ads, top-campaigns, top-creatives, top-landing-pages, top-headlines, top-copy. Each with appropriate columns and data sources.

"Create report" sidebar action for custom reports.

PostHog: `report_viewed`, `report_exported`

VERIFY:
- [ ] All 6 pages load with data
- [ ] Sorting, pagination, date range, CSV export all work
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 9 ✅
Commit: `feat: reports module with 6 report types`
```

---

# PHASE 10: CAMPAIGN ANALYSIS

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 9 is complete.

TASK: Campaign Analysis deep-dive at (dashboard)/campaign-analysis/page.tsx.

Features: campaign search, date range picker with presets, comparison mode, Recharts line/bar/scatter charts, expandable drill-down (campaign → ad sets → ads), filters (status, objective, spend/ROAS range), CSV export.

PostHog: `campaign_analysis_viewed`, `campaign_drill_down`

VERIFY:
- [ ] Page loads with charts and campaign table
- [ ] Drill-down works
- [ ] Filters narrow results
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 10 ✅
Commit: `feat: campaign analysis with charts and drill-down`
```

---

# PHASE 11: DISCOVER (AD LIBRARY BROWSER)

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 10 is complete.

TASK: Build Discover page at (dashboard)/discover/page.tsx.

"Browse the global Meta Ads Library feed and save ads to boards."

Search bar: brand search, active ads toggle, format dropdown (All/Image/Video/Carousel), sort (Start date new→old), filters button, ads per page (12/24/48), pagination.

3-column ad card grid: brand logo+name, runtime, "Live" badge, "+N versions" badge, media preview, format label+date, product name, body text, URL, platform icons (FB/IG/Messenger/AN/Threads), "Add to board" button.

Add to board flow: popover with board list, create new board option, save via API, success toast.

PostHog: `discover_page_viewed`, `discover_search`, `ad_saved_to_board`

VERIFY:
- [ ] Page loads with ad grid
- [ ] Search, filter, sort, pagination work
- [ ] "Add to board" saves ad correctly
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 11 ✅
Commit: `feat: discover feed with ad library browser and save to board`
```

---

# PHASE 12: BOARDS

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 11 is complete.

TASK: Build Boards at (dashboard)/boards/.

List page: board cards with name, description, count, "Open board →", "Create board" button.

Detail page /boards/[id]: board title, Refresh/Back, "Create Variations" sparkle button, format filter, saved ad grid (brand, time since saved, versions badge, preview, name, copy, URL, "✨ Variations" button per card), items per page, pagination.

CRUD API: list, create, get, update, delete boards; add/remove ads.

PostHog: `board_created`, `board_viewed`, `variation_triggered`

VERIFY:
- [ ] Board list and detail work
- [ ] Create board, add/remove ads work
- [ ] Variations buttons exist
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 12 ✅
Commit: `feat: boards with list, detail, CRUD operations`
```

---

# PHASE 13: ASSETS

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 12 is complete.

TASK: Build Assets (product catalog) at (dashboard)/assets/page.tsx.

Product grid, "Add Product" modal (name, description, image upload to Supabase Storage), edit/delete, search.

PostHog: `asset_created`, `asset_deleted`

VERIFY:
- [ ] Product CRUD works with image upload
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 13 ✅
Commit: `feat: assets product catalog with image upload`
```

---

# PHASE 14: AI CREATIVE VARIATIONS

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 13 is complete.

TASK: Build AI Creative Variations system.

Trigger: "Create Variations" button on boards/cards.

Modal: Product selector (from Assets, with image validation warning), 6 strategy cards in 2x3 grid (Hero Product, Curiosity, Pain Point, Proof Point, Image Only, Text Only — each with description and Visual/Text tags), generation settings, credit cost display, "✨ Generate Variations" button.

AI pipeline (lib/ai/variations.ts): build strategy-specific prompts, generate text via OpenAI, generate images via DALL-E, save results, deduct credits.

Results view: original vs generated side-by-side, download/copy buttons.

PostHog: `variation_generation_started`, `variation_generation_completed`

VERIFY:
- [ ] Modal opens from board, product selector works
- [ ] All 6 strategies render
- [ ] Credit cost shown
- [ ] Generation pipeline works (or mock)
- [ ] Credits deducted
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 14 ✅
Commit: `feat: AI creative variations with 6 strategies and credit system`
```

---

# PHASE 15: CHROME EXTENSION

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 14 is complete.

TASK: Build Chrome Extension in /extension directory.

Manifest V3, content script on facebook.com/ads/library/*, connection banner ("● Glued.me · Connect extension"), green "📥 Save" buttons on each ad card, board selector popup, auth sync via chrome.storage, popup UI for connection status.

VERIFY:
- [ ] Extension loads in developer mode
- [ ] Save buttons inject on Ad Library
- [ ] Saving to board works
- [ ] TypeScript compiles (extension code)

Update PROGRESS.md → Phase 15 ✅
Commit: `feat: Chrome extension for Meta Ad Library integration`
```

---

# PHASE 16: POSTHOG DEEP INTEGRATION

## Prompt for Claude Code:

```
Read CLAUDE.md and PROGRESS.md. Confirm Phase 15 is complete.

TASK: Comprehensive PostHog sweep across entire app.

Create lib/analytics/events.ts with typed event definitions for ALL events. Sweep every page and component adding PostHog calls. User identification, workspace group analytics, feature flags integration.

Full event taxonomy (40+ events across auth, dashboard, automations, discover, boards, variations, reports, integrations, credits).

VERIFY:
- [ ] Every page navigation tracked
- [ ] All events from taxonomy firing
- [ ] User identified, workspace grouped
- [ ] No duplicate events
- [ ] TypeScript compiles

Update PROGRESS.md → Phase 16 ✅
Commit: `feat: comprehensive PostHog analytics with typed events`
```

---

# PHASES 17-20: POLISH & SHIP

## Phase 17: Credit System & Billing
Credit balance display, deduction logic, transaction history, insufficient balance handling, purchase flow placeholder.

## Phase 18: Production Hardening
Error boundaries, rate limiting, Zod validation on all routes, security headers, logging, image optimization, accessibility, loading/empty states, toast notifications.

## Phase 19: Testing & QA
Vitest unit tests (>80% coverage on lib/), Playwright E2E tests (auth flow, dashboard, create automation, discover→board→variation), integration tests for API routes.

## Phase 20: Deployment & CI/CD
Vercel config with crons, Supabase production setup, GitHub Actions pipeline, PostHog dashboards, monitoring/alerting.

---

# QUICK START COMMAND

Paste this into every new Claude Code session:

```
Read the files CLAUDE.md, PROGRESS.md, and GLUED_BUILD_PLAN.md.
Tell me which phase is next based on PROGRESS.md.
Then execute that phase following the Ralph Loop protocol:
1. Implement all features listed
2. Run every verification check
3. If any check fails, fix it before proceeding
4. Update PROGRESS.md with completion status and notes
5. Commit with conventional commit message
6. STOP — do not proceed to the next phase

Begin.
```

---

# APPENDIX: TECH STACK REFERENCE

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth |
| Database | Supabase Postgres + Drizzle ORM |
| Storage | Supabase Storage |
| Meta API | Marketing API v21.0 |
| Ad Library | Meta Ads Library API/Scraper |
| Slack | Slack Web API + OAuth |
| AI Text | OpenAI GPT-4o |
| AI Image | DALL-E 3 |
| Analytics | PostHog (client + server) |
| Charts | Recharts |
| Testing | Vitest + Playwright |
| Deployment | Vercel + Supabase Cloud |
| CI/CD | GitHub Actions |
| Extension | Chrome Manifest V3 |
