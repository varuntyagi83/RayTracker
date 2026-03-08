# Voltic — Known Bugs & Issues Tracker

> Maintained by Claude Code across sessions.
> Update status when a bug is fixed. Add new findings at the top of each severity section.
> Last updated: 2026-03-08 (Round 5 audit complete)

---

## Legend
| Status | Meaning |
|--------|---------|
| ❌ Open | Not yet fixed |
| 🔧 In Progress | Being worked on |
| ✅ Fixed | Fixed and committed |
| 🚫 Won't Fix | Accepted risk / by design |

---

## CRITICAL

| ID | Status | File | Description |
|----|--------|------|-------------|
| C-1 | ✅ Fixed | `src/app/api/studio/chat/route.ts` | Studio chat never deducted credits. Fixed: added `checkAndDeductCredits` upfront + `refundCredits` on error. Commit: `3fc93d7` |
| C-2 | ✅ Fixed | `src/lib/data/insights.ts`, `src/lib/data/credits.ts` | Optimistic lock silent failure — `.eq("credit_balance", old)` matched 0 rows but returned `error: null`. Fixed: added `.select()` + `!updated?.length`. Commit: `3fc93d7` |
| C-3 | ✅ Fixed | `src/app/api/webhooks/stripe/route.ts`:62 | Stripe webhook missing idempotency — `addCredits()` called twice on Stripe retries, doubling credits. Fixed: dedup check via `reference_id` + pass `session.id` to insert. Commit: `546ff23` |
| C-4 | ✅ Fixed | `src/app/api/decompose/route.ts`:20 | SSRF gap — `169.254.x.x` (AWS/GCP metadata) not blocked. Fixed: added `169\.254\.` to BLOCKED regex. Commit: `546ff23` |
| C-5 | ✅ Fixed | `src/lib/data/insights.ts`:162 | Silent credit refund failure — `refundCredits()` retry only fired on `updateErr`, but Supabase returns `error:null` on 0-rows-updated. Fixed: 3-attempt loop checking `updated?.length`. Commit: `546ff23` |

---

## HIGH

| ID | Status | File | Description |
|----|--------|------|-------------|
| H-1 | ✅ Fixed | `src/lib/automations/executor.ts` | Slack global token fallback leaking one workspace's token to others. Removed. Commit: `4d9df08` |
| H-2 | ✅ Fixed | `src/app/api/webhooks/cron/automations/route.ts` | Cron window too tight (±5 min). Broadened to ±10 min. Commit: `aaab8ec` |
| H-3 | ✅ Fixed | `src/app/(dashboard)/automations/actions.ts` | Automation toggle race condition. Fixed with optimistic lock on `status`. Commit: `aaab8ec` |
| H-4 | ✅ Fixed | `src/lib/automations/executor.ts` | Empty Slack digests sent with 0 items. Added guard. Commit: `aaab8ec` |
| H-5 | ✅ Fixed | `src/lib/data/studio.ts` | N+1 query in `listConversations()`. Fixed with Supabase relational join. Commit: `aaab8ec` |
| H-6 | ✅ Fixed | `src/lib/ai/variations.ts` | Prompt injection via `customInstruction`. Sanitized. Commit: `aaab8ec` |
| H-7 | ✅ Fixed | `src/lib/ai/variations.ts` | Unguarded `JSON.parse` on variation AI response. Wrapped in try/catch. Commit: `aaab8ec` |
| H-8 | ❌ Open | `src/app/api/webhooks/cron/automations/route.ts`:122 | **Concurrent cron duplicate execution** — Two Vercel invocations within 10 min both pass `last_run_at < 55 min` before either writes (read-then-write race). Fix: atomic conditional update `.update({ last_run_at }).lt("last_run_at", 55_min_ago)`. |
| H-17 | ❌ Open | `src/app/api/auth/slack/callback/route.ts`:11 | **Slack OAuth missing CSRF state validation** — callback accepts any `code` without verifying a `state` nonce from the initiation step. An attacker can trick an authenticated user into linking the attacker's Slack workspace to their Voltic account. Fix: generate random `state` on initiation, validate in callback. Round 5. |
| H-18 | ❌ Open | `src/app/api/brand-guidelines/upload/route.ts`:76 | **Batch brand-guidelines upload skips MIME type check** — single-file logo path validates MIME type (line 48) but the batch `files` path (line 76-84) only checks file size, skipping type validation. Any file type can be uploaded. Fix: add `ALLOWED_IMAGE_TYPES.includes(file.type)` check in the batch loop. Round 5. |
| H-9 | ❌ Open | `src/lib/data/variations.ts`:148 | **No pagination on variation history** — `limit(50)` hardcoded, UI loads all at once. Power users hit OOM/timeout. Fix: cursor-based pagination. |
| H-10 | ❌ Open | `src/app/(dashboard)/assets/actions.ts`:59 | **No server-side file size limit** — 5 MB limit is client-side only; bypass with direct API call. Fix: check `Content-Length` header before processing. |
| H-11 | ❌ Open | `src/lib/utils/rate-limit.ts` | **In-memory rate limiter breaks on multi-instance Vercel** — each lambda has its own counter. Fix: Upstash Redis rate limiting. |
| H-12 | ❌ Open | `src/app/api/auth/meta/callback/route.ts`:161 | **`parseInt` without radix + no NaN guard** in Meta OAuth callback. Fix: `parseInt(value \|\| "0", 10)` + `isNaN()` check. |
| H-13 | ✅ Fixed | `src/app/api/meta/sync/route.ts` | **`parseInt` without radix in Meta sync route** — added `parseBudgetCents()` helper with radix 10 + NaN guard; all `parseInt` calls now use `, 10`. Commit: `7a2fdcd` |
| H-14 | ✅ Fixed | 6 AI files | **Unguarded `JSON.parse` in 6 AI files** — wrapped all `JSON.parse` calls in try/catch with user-friendly errors (insights, comparison, creative-enhance, competitor-report, decompose, brand-guidelines-generator). Commit: `7a2fdcd` |
| H-15 | ✅ Fixed | `src/app/(dashboard)/creative-studio/components/chat-panel.tsx` | **No AbortController on streaming reader** — added AbortController ref, unmount cleanup, toast.error on real failures; AbortError ignored. Commit: `7a2fdcd` |
| H-16 | ✅ Fixed | `src/app/(dashboard)/variations/components/variations-page-client.tsx` | **`URL.createObjectURL` never revoked** — revoke previous URL before creating new; clear + unmount cleanup. Commit: `7a2fdcd` |

---

## MEDIUM

| ID | Status | File | Description |
|----|--------|------|-------------|
| M-1 | ✅ Fixed | `src/scripts/seed.ts` | Stale seed dates. Fixed to use relative dates. |
| M-2 | ✅ Fixed | Multiple dashboard pages | Demo banner missing. Added banner component. |
| M-3 | ✅ Fixed | `src/app/api/decompose/route.ts` | Basic SSRF — private IP ranges not blocked. Fixed with `isPublicUrl()`. Commit: `4d9df08` |
| M-4 | ❌ Open | `src/app/(dashboard)/home/page.tsx`:41 | **Demo mode false trigger** — `isDemoMode` fires when `revenue === 0 && spend === 0`. New real users see fake demo data. Fix: explicit `demo_mode` workspace flag or proper empty state. |
| M-12 | ❌ Open | `src/app/api/studio/upload/route.ts`:69 | **Studio upload filename not sanitized** — `${workspace.id}/studio/${Date.now()}-${file.name}` uses raw filename in storage path. A filename with special chars (`../`, ` `, `%`) can cause unexpected path behavior. Fix: replace non-alphanumeric chars before building storagePath. Round 5. |
| M-5 | ❌ Open | `src/app/api/webhooks/cron/automations/route.ts`:87 | **DST-unsafe timezone conversion** — `toLocaleString()` not spec-guaranteed, ±1 hour drift on DST transitions. Fix: use `date-fns-tz` or `luxon`. |
| M-6 | ❌ Open | `src/app/(dashboard)/assets/actions.ts`:90 | **Silent error suppression** — `deleteAssetImage().catch(() => {})` swallows failures. Fix: add `console.warn` log. |
| M-7 | ❌ Open | Multiple files | **Magic number credit costs** — `VARIATION_CREDIT_COST`, `INSIGHT_CREDIT_COST` scattered. Fix: centralize in `src/config/constants.ts`. |
| M-8 | ❌ Open | `src/lib/data/credits.ts`:27 | **Pagination offset not capped** — user-supplied `page` with no max triggers giant Postgres offset. Fix: `Math.min(page, 1000)`. |
| M-9 | ✅ Fixed | `src/app/(dashboard)/boards/actions.ts` | **`revalidatePath` missing after mutations** — added `revalidatePath("/boards")` after create, update, delete. Commit: `7a2fdcd` |
| M-10 | ✅ Fixed | `src/app/api/studio/upload/route.ts` | **File size checked after buffering** — added `Content-Length` check before `req.formData()` with 413 response. Commit: `7a2fdcd` |
| M-11 | ✅ Fixed | `src/app/(dashboard)/creative-studio/components/chat-panel.tsx` | **No error toast on stream failure** — added `toast.error(msg)` in catch block (part of H-15 fix). Commit: `7a2fdcd` |

---

## LOW

| ID | Status | File | Description |
|----|--------|------|-------------|
| L-1 | ❌ Open | `src/lib/data/variations.ts`:162 | **Inconsistent null handling** — mix of `null`, `""`, `"Unknown"` for missing fields. Standardize to `null`. |
| L-2 | ❌ Open | Multiple API routes | **Missing structured error context in logs** — errors logged without `workspace_id`/`user_id`. Add context to all `console.error` calls. |
| L-3 | ❌ Open | `src/lib/data/studio.ts`:302-357 | **Sequential mention resolution** — `resolveMentions()` resolves each mention one-at-a-time in a loop. Fix: use `Promise.all()` for parallel resolution. |

---

## False Positives (Investigated, Not Real Bugs)

| Finding | Why Dismissed |
|---------|---------------|
| Extension boards cross-workspace leak | Route has `.eq("workspace_id", auth.workspaceId)` — properly scoped ✅ |
| Soft delete filtering missing in queries | Schema has **no `deleted_at` column** — app uses hard deletes by design ✅ |
| Open redirect in checkout | `success_url` uses `process.env.NEXT_PUBLIC_APP_URL`, not user input ✅ |
| Ad insights credits not deducted (Round 2) | Credits ARE deducted in `boards/actions.ts` via `checkAndDeductCredits` ✅ |
| Meta sync missing workspace scope on ad accounts | Ad accounts query does filter by `workspace_id` ✅ |
| R5-1: Facebook pages .single() missing error check | Using `.single()` for upsert existence check — `data:null` on PGRST116 is handled correctly as "insert" path ✅ |
| R5-3: Rate limiter all 60s windows | Already tracked as H-11 (in-memory rate limiter) ✅ |
| R5-7: Workspace isolation in insights | Query already has `.eq("workspace_id", workspaceId)` filter ✅ |
| R5-8: Credit race unlimited bypass | Theoretical only — existing optimistic lock (`.eq("credit_balance", old)`) prevents negative balance ✅ |
| R5-10: Decomposition cache staleness | Already uses `.order("created_at", { ascending: false })` — returns newest ✅ |

---

## Stats

| Severity | Total Found | Fixed | Open |
|----------|-------------|-------|------|
| Critical | 5 | 5 | 0 |
| High | 18 | 11 | 7 |
| Medium | 12 | 6 | 6 |
| Low | 3 | 0 | 3 |
| **Total** | **38** | **22** | **16** |
