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

## Project Structure
```
src/
├── app/
│   ├── (auth)/              # Login, signup pages
│   ├── (dashboard)/         # Main app pages (protected)
│   │   ├── layout.tsx       # Dashboard layout with sidebar
│   │   ├── home/            # Workspace overview dashboard
│   │   ├── automations/     # Automation list + wizards
│   │   ├── campaign-analysis/
│   │   ├── discover/        # Ad library browser
│   │   ├── boards/          # Saved ad collections
│   │   ├── assets/          # Product catalog
│   │   └── reports/         # 6 report types
│   ├── api/                 # API routes (webhooks, integrations)
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # shadcn components
│   ├── layout/              # Sidebar, Header
│   └── shared/              # Reusable components
├── lib/
│   ├── supabase/            # Supabase clients (browser + server)
│   ├── meta/                # Meta API + Ads Library integration
│   ├── slack/               # Slack bot + message templates
│   ├── ai/                  # AI variation generation
│   ├── analytics/           # PostHog client + server + event types
│   ├── automations/         # Execution engine + scheduler
│   └── utils/               # Helpers (dates, formatting, etc.)
├── db/
│   ├── schema.ts            # Drizzle schema (all tables)
│   └── migrations/
├── types/                   # Shared TypeScript types
└── scripts/
    └── seed.ts              # Development seed data
```

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

## Build Plan Reference
The full 20-phase build plan is documented in `GLUED_BUILD_PLAN.md`. Each phase is designed to be executed in a single Claude Code session following the Ralph Loop protocol. Read `PROGRESS.md` to determine which phase to execute next.

## IMPORTANT RULES
1. **NEVER skip TypeScript types** — every function, every component, every API response
2. **NEVER hardcode workspace_id** — always derive from auth session
3. **ALWAYS read PROGRESS.md first** — know which phase you're on before writing code
4. **ALWAYS update PROGRESS.md** after completing a phase
5. **ALWAYS commit after each phase** with conventional commit message
6. **NEVER proceed to next phase without verification** — run every check first
7. **Use environment variables** for all secrets and configuration
8. **Handle errors gracefully** — never let errors crash the app silently
9. **One phase per session** — after commit, STOP and let the user start a fresh session
