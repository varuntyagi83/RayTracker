# Voltic — Known Bugs & Issues Tracker

> Maintained by Claude Code across sessions.
> Update status when a bug is fixed. Add new findings at the top of each severity section.
> Last updated: 2026-03-08 (Round 5 fixes complete — 28/38 fixed)

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
| H-8 | ✅ Fixed | `src/app/api/webhooks/cron/automations/route.ts` | **Concurrent cron duplicate execution** — added atomic claim step: UPDATE automations SET last_run_at WHERE id IN (due) AND (last_run_at IS NULL OR last_run_at < cutoff). Only IDs returned are executed; second instance gets 0 rows and skips them. Commit: `1771d60` |
| H-17 | ❌ Open | `src/app/api/auth/slack/callback/route.ts`:11 | **Slack OAuth missing CSRF state validation** — callback accepts any `code` without verifying a `state` nonce from the initiation step. An attacker can trick an authenticated user into linking the attacker's Slack workspace to their Voltic account. Fix: generate random `state` on initiation, validate in callback. Round 5. |
| H-18 | ✅ Fixed | `src/app/api/brand-guidelines/upload/route.ts`:76 | **Batch brand-guidelines upload skips MIME type check** — added `ALLOWED_IMAGE_TYPES.includes(file.type)` check in batch loop before size check. Commit: `e1de9e4` |
| H-9 | ❌ Open | `src/lib/data/variations.ts`:148 | **No pagination on variation history** — `limit(50)` hardcoded, UI loads all at once. Power users hit OOM/timeout. Fix: cursor-based pagination. |
| H-10 | 🚫 Won't Fix | `src/app/(dashboard)/assets/actions.ts`:59 | **No server-side file size limit** — False positive: `next.config.ts` already sets `serverActions.bodySizeLimit: "5mb"` which enforces the limit at the Next.js layer. File size check also runs server-side before buffering. |
| H-11 | ❌ Open | `src/lib/utils/rate-limit.ts` | **In-memory rate limiter breaks on multi-instance Vercel** — each lambda has its own counter. Fix: Upstash Redis rate limiting. |
| H-12 | 🚫 Won't Fix | `src/app/api/auth/meta/callback/route.ts` | **`parseInt` without radix** — False positive: no `parseInt` calls exist in this file. `account_status` is typed as `number` from the Meta API response — no parsing needed. `STATUS_MAP` lookup is a typed `Record<number, string>`. |
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
| M-4 | ✅ Fixed | `src/app/(dashboard)/home/page.tsx`:41 | **Demo mode false trigger** — changed `isDemoMode` to `kpis.adAccountCount === 0` so placeholder data only shows when no accounts are connected, not when real users have zero spend. Commit: `1771d60` |
| M-12 | ✅ Fixed | `src/app/api/studio/upload/route.ts`:69 | **Studio upload filename not sanitized** — replaced `file.name` with sanitized `safeFileName` (`/[^a-zA-Z0-9._-]/g → "_"`, capped at 100 chars) before building storagePath. Commit: `e1de9e4` |
| M-5 | ❌ Open | `src/app/api/webhooks/cron/automations/route.ts`:87 | **DST-unsafe timezone conversion** — `toLocaleString()` not spec-guaranteed, ±1 hour drift on DST transitions. Fix: use `date-fns-tz` or `luxon`. |
| M-6 | ✅ Fixed | `src/app/(dashboard)/assets/actions.ts`:90 | **Silent error suppression** — `deleteAssetImage().catch(() => {})` now logs `console.warn` with context. Commit: `1771d60` |
| M-7 | ❌ Open | Multiple files | **Magic number credit costs** — `VARIATION_CREDIT_COST`, `INSIGHT_CREDIT_COST` scattered. Fix: centralize in `src/config/constants.ts`. |
| M-8 | ✅ Fixed | `src/lib/data/credits.ts`:27 | **Pagination offset not capped** — `safePage = Math.min(Math.max(1, page), 1000)` applied before computing Postgres range. Commit: `1771d60` |
| M-9 | ✅ Fixed | `src/app/(dashboard)/boards/actions.ts` | **`revalidatePath` missing after mutations** — added `revalidatePath("/boards")` after create, update, delete. Commit: `7a2fdcd` |
| M-10 | ✅ Fixed | `src/app/api/studio/upload/route.ts` | **File size checked after buffering** — added `Content-Length` check before `req.formData()` with 413 response. Commit: `7a2fdcd` |
| M-11 | ✅ Fixed | `src/app/(dashboard)/creative-studio/components/chat-panel.tsx` | **No error toast on stream failure** — added `toast.error(msg)` in catch block (part of H-15 fix). Commit: `7a2fdcd` |

---

## LOW

| ID | Status | File | Description |
|----|--------|------|-------------|
| L-1 | ❌ Open | `src/lib/data/variations.ts`:162 | **Inconsistent null handling** — mix of `null`, `""`, `"Unknown"` for missing fields. Standardize to `null`. |
| L-2 | ❌ Open | Multiple API routes | **Missing structured error context in logs** — errors logged without `workspace_id`/`user_id`. Add context to all `console.error` calls. |
| L-3 | ✅ Fixed | `src/lib/data/studio.ts`:302 | **Sequential mention resolution** — `resolveMentions()` now uses `Promise.all()` to resolve all mentions in parallel; reduces latency by N-1 round-trips. Commit: `1771d60` |

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

| Severity | Total Found | Fixed | Won't Fix | Open |
|----------|-------------|-------|-----------|------|
| Critical | 5 | 5 | 0 | 0 |
| High | 18 | 13 | 2 | 3 |
| Medium | 12 | 9 | 0 | 3 |
| Low | 3 | 1 | 0 | 2 |
| **Total** | **38** | **28** | **2** | **8** |
