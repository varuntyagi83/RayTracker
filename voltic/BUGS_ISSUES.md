# Voltic — Known Bugs & Issues Tracker

> Maintained by Claude Code across sessions.
> Update status when a bug is fixed. Add new findings at the top of each severity section.
> Last updated: 2026-03-08 (Round 9 fixes complete — all 10 R9 bugs resolved)

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
| C-6 | ✅ Fixed | `src/lib/data/credits.ts`:102, `src/lib/data/insights.ts`:137,197 | **Credit transaction insert not error-checked** — added `const { error: txErr }` check on all 3 transaction inserts; logs `console.error` with context when ledger insert fails. Round 9. Commit: `pending` |

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
| H-17 | ✅ Fixed | `src/app/api/auth/slack/callback/route.ts` | **Slack OAuth missing CSRF state validation** — created `/api/auth/slack/route.ts` to generate `crypto.randomUUID()` state stored in httpOnly cookie (10 min TTL). Callback validates and deletes cookie before accepting code. Added Slack connection card to Settings. Commit: `271af1d` |
| H-18 | ✅ Fixed | `src/app/api/brand-guidelines/upload/route.ts`:76 | **Batch brand-guidelines upload skips MIME type check** — added `ALLOWED_IMAGE_TYPES.includes(file.type)` check in batch loop before size check. Commit: `e1de9e4` |
| H-9 | ✅ Fixed | `src/lib/data/variations.ts` | **No pagination on variation history** — added cursor-based pagination using `created_at` ISO timestamp as cursor. `getAllVariations()` accepts optional `cursor` param; UI shows "Load More" button, appends next page. PAGE_SIZE = 20. Commit: `271af1d` |
| H-10 | 🚫 Won't Fix | `src/app/(dashboard)/assets/actions.ts`:59 | **No server-side file size limit** — False positive: `next.config.ts` already sets `serverActions.bodySizeLimit: "5mb"` which enforces the limit at the Next.js layer. File size check also runs server-side before buffering. |
| H-11 | ✅ Fixed | `src/lib/utils/rate-limit.ts` | **In-memory rate limiter breaks on multi-instance Vercel** — added `AsyncRateLimiter` that uses `@upstash/ratelimit` sliding window when `UPSTASH_REDIS_REST_URL`/`TOKEN` env vars are set; falls back to in-memory `RateLimiter` for local dev/test. All 4 callers updated to `await`. 12 tests pass. Commit: `646e403` |
| H-12 | 🚫 Won't Fix | `src/app/api/auth/meta/callback/route.ts` | **`parseInt` without radix** — False positive: no `parseInt` calls exist in this file. `account_status` is typed as `number` from the Meta API response — no parsing needed. `STATUS_MAP` lookup is a typed `Record<number, string>`. |
| H-13 | ✅ Fixed | `src/app/api/meta/sync/route.ts` | **`parseInt` without radix in Meta sync route** — added `parseBudgetCents()` helper with radix 10 + NaN guard; all `parseInt` calls now use `, 10`. Commit: `7a2fdcd` |
| H-14 | ✅ Fixed | 6 AI files | **Unguarded `JSON.parse` in 6 AI files** — wrapped all `JSON.parse` calls in try/catch with user-friendly errors (insights, comparison, creative-enhance, competitor-report, decompose, brand-guidelines-generator). Commit: `7a2fdcd` |
| H-15 | ✅ Fixed | `src/app/(dashboard)/creative-studio/components/chat-panel.tsx` | **No AbortController on streaming reader** — added AbortController ref, unmount cleanup, toast.error on real failures; AbortError ignored. Commit: `7a2fdcd` |
| H-16 | ✅ Fixed | `src/app/(dashboard)/variations/components/variations-page-client.tsx` | **`URL.createObjectURL` never revoked** — revoke previous URL before creating new; clear + unmount cleanup. Commit: `7a2fdcd` |
| H-19 | ✅ Fixed | `src/lib/data/competitors.ts`:99 | **N+1 upsert loop in `saveCompetitorAds()`** — replaced sequential for-loop with single batch `supabase.upsert(rows, { onConflict: "workspace_id,meta_library_id" })`. Round 9. Commit: `pending` |
| H-20 | ✅ Fixed | `src/app/api/meta/sync/route.ts`:15 | **No rate limiting on `/api/meta/sync`** — added `await apiLimiter.check(member.workspace_id, 3)` with 429 response. Round 9. Commit: `pending` |
| H-21 | ✅ Fixed | `src/app/(dashboard)/discover/actions.ts`:103 | **TOCTOU double-charge race in insight analysis** — added re-check for existing insight after credit deduction; refunds and returns cached result if concurrent request won the race. Round 9. Commit: `pending` |

---

## MEDIUM

| ID | Status | File | Description |
|----|--------|------|-------------|
| M-1 | ✅ Fixed | `src/scripts/seed.ts` | Stale seed dates. Fixed to use relative dates. |
| M-2 | ✅ Fixed | Multiple dashboard pages | Demo banner missing. Added banner component. |
| M-3 | ✅ Fixed | `src/app/api/decompose/route.ts` | Basic SSRF — private IP ranges not blocked. Fixed with `isPublicUrl()`. Commit: `4d9df08` |
| M-4 | ✅ Fixed | `src/app/(dashboard)/home/page.tsx`:41 | **Demo mode false trigger** — changed `isDemoMode` to `kpis.adAccountCount === 0` so placeholder data only shows when no accounts are connected, not when real users have zero spend. Commit: `1771d60` |
| M-12 | ✅ Fixed | `src/app/api/studio/upload/route.ts`:69 | **Studio upload filename not sanitized** — replaced `file.name` with sanitized `safeFileName` (`/[^a-zA-Z0-9._-]/g → "_"`, capped at 100 chars) before building storagePath. Commit: `e1de9e4` |
| M-5 | ✅ Fixed | `src/app/api/webhooks/cron/automations/route.ts` | **DST-unsafe timezone conversion** — replaced `toLocaleString()` with `Intl.DateTimeFormat.formatToParts()` in new `getLocalTimeParts()` helper. Spec-guaranteed, DST-safe, no new dependencies. Commit: `271af1d` |
| M-6 | ✅ Fixed | `src/app/(dashboard)/assets/actions.ts`:90 | **Silent error suppression** — `deleteAssetImage().catch(() => {})` now logs `console.warn` with context. Commit: `1771d60` |
| M-7 | 🚫 Won't Fix | Multiple files | **Magic number credit costs** — Constants are already named exports co-located with their domain: `VARIATION_CREDIT_COST` in `types/variations.ts`, `INSIGHT_CREDIT_COST` in `data/insights.ts`, etc. No refactor needed — creating a re-export constants.ts would be over-engineering. |
| M-8 | ✅ Fixed | `src/lib/data/credits.ts`:27 | **Pagination offset not capped** — `safePage = Math.min(Math.max(1, page), 1000)` applied before computing Postgres range. Commit: `1771d60` |
| M-9 | ✅ Fixed | `src/app/(dashboard)/boards/actions.ts` | **`revalidatePath` missing after mutations** — added `revalidatePath("/boards")` after create, update, delete. Commit: `7a2fdcd` |
| M-10 | ✅ Fixed | `src/app/api/studio/upload/route.ts` | **File size checked after buffering** — added `Content-Length` check before `req.formData()` with 413 response. Commit: `7a2fdcd` |
| M-11 | ✅ Fixed | `src/app/(dashboard)/creative-studio/components/chat-panel.tsx` | **No error toast on stream failure** — added `toast.error(msg)` in catch block (part of H-15 fix). Commit: `7a2fdcd` |
| M-13 | ✅ Fixed | `src/app/api/auth/meta/callback/route.ts`:75 | **Meta OAuth external error message leaked to redirect URL** — replaced `tokenData.error.message` with hardcoded `"token_exchange"` code. Round 9. Commit: `pending` |
| M-14 | ✅ Fixed | `src/app/(dashboard)/variations/actions.ts`:17 | **Cursor parameter not validated in `fetchAllVariations`** — added `z.string().datetime().optional()` Zod schema; returns `{ error: "Invalid cursor" }` on malformed input. Round 9. Commit: `pending` |
| M-15 | ✅ Fixed | `src/lib/ai/openai.ts`, `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/decompose.ts` | **No retry on transient AI API failures** — set `maxRetries: 3` on OpenAI client; added `geminiPost()` helper with 3-attempt exponential backoff (1s/2s) for retryable status codes (429, 500, 503) in `gemini-image-edit.ts`; inline retry loop in `decompose.ts` `_inpaintWithGemini()`. Round 9. Commit: `pending` |
| M-16 | ✅ Fixed | `src/lib/data/competitors.ts`:144 | **In-app filtering loads ALL competitor reports for deletion** — replaced fetch-all + JS filter with `.overlaps("competitor_brand_ids", brandIds)` Postgres array overlap query. Round 9. Commit: `pending` |

---

## LOW

| ID | Status | File | Description |
|----|--------|------|-------------|
| L-1 | ✅ Fixed | `src/lib/data/variations.ts` | **Inconsistent null handling** — `VariationWithContext.assetName` and `assetImageUrl` typed as `string | null`; `getAllVariations` returns `null` instead of `"Unknown"` and `""` for missing fields. Commit: `271af1d` |
| L-2 | ✅ Fixed | Multiple API routes | **Missing structured error context in logs** — added `workspace_id` to error logs in composite, composite-batch, download, generate-background, generate-image, and decompose routes using `let workspaceId` hoisted before try block. Commit: `4dc5296` |
| L-3 | ✅ Fixed | `src/lib/data/studio.ts`:302 | **Sequential mention resolution** — `resolveMentions()` now uses `Promise.all()` to resolve all mentions in parallel; reduces latency by N-1 round-trips. Commit: `1771d60` |
| L-4 | ✅ Fixed | `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/decompose.ts` | **No request timeout on Gemini API fetch calls** — added `AbortSignal.timeout(60_000)` to mask generation call and `AbortSignal.timeout(120_000)` to image editing calls. OpenAI SDK already applies its own timeout. Round 9. Commit: `pending` |

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
| R9-1: deleteAssetImage fire-and-forget in insights.ts:91 | Not present — line 91 is inside `checkAndDeductCredits()` (unlimited credits early return). Already fixed as M-6 in assets/actions.ts ✅ |
| R9-2: No workspace validation in creative-studio/actions.ts | All actions call `getWorkspace()` and pass `workspace.id` to all DB queries ✅ |
| R9-3: Chat streaming state updates after unmount | AbortController properly signals cancellation; `reader.read()` will throw an AbortError which is caught and ignored ✅ |
| R9-4: Chat file upload no timeout | Acceptable — Vercel function maxDuration limits act as the outer timeout; tracked as L-4 for explicit timeouts ✅ |

---

## Stats

| Severity | Total Found | Fixed | Won't Fix | Open |
|----------|-------------|-------|-----------|------|
| Critical | 6 | 5 | 0 | 1 |
| High | 21 | 16 | 2 | 3 |
| Medium | 16 | 11 | 1 | 4 |
| Low | 4 | 3 | 0 | 1 |
| **Total** | **47** | **35** | **3** | **9** |
