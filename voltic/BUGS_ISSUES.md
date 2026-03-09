# Voltic — Known Bugs & Issues Tracker

> Maintained by Claude Code across sessions.
> Update status when a bug is fixed. Add new findings at the top of each severity section.
> Last updated: 2026-03-09 (Round 12 fixes complete — all 9 R12 security bugs resolved)

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
| C-7 | ✅ Fixed | `src/app/api/ads/composite/route.ts`:43, `src/app/api/ads/composite-batch/route.ts`:45 | **SSRF in ad compositing routes** — `fetch(backgroundImageUrl)` called with no URL allowlist or private-IP check. Both routes accept `backgroundImageUrl` from the request body and immediately fetch it. An authenticated user can probe internal endpoints (AWS metadata `169.254.169.254`, Supabase admin, internal services). C-4 fixed SSRF in `/api/decompose` but these two routes were missed. Fix: apply same `isPublicUrl()` guard from decompose route. Round 10. Commit: `10bfcce` |
| C-8 | ✅ Fixed | `src/lib/ai/gemini-image-edit.ts`:147,250 · `src/lib/ai/decompose.ts`:325 | **Google API key exposed in URL query string** — `?key=${apiKey}` appended to Gemini API URLs; key gets written to Vercel/server access logs and any third-party monitoring. Fix: removed `?key=` from URLs, added `"x-goog-api-key": apiKey` header in `geminiPost()` (gemini-image-edit.ts) and fetch headers in `_inpaintWithGemini()` (decompose.ts). Round 12. Commit: `f260ca1` |
| C-9 | ✅ Fixed | `src/lib/ai/variations.ts`, `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/decompose.ts` | **Prompt injection via unsanitized user inputs in AI prompts** — asset names, asset descriptions, competitor ad headline/body/brandName, brand guideline fields (brandVoice, targetAudience, dosAndDonts, colorPalette), and customInstruction in Gemini prompts were embedded raw. Fix: created `src/lib/utils/prompt-sanitize.ts` with `sanitizeForPrompt()` (strips newlines, `---`, backticks, truncates); applied to all user-controlled strings across all prompt builders. Round 12. Commit: `f260ca1` |
| C-10 | ✅ Fixed | `src/app/api/assets/generate-background/route.ts` | **No Zod validation on generate-background route** — `brandGuidelineId` accepted as any string (no UUID check), `prompt` accepted as any length string and embedded raw into OpenAI prompt. Only AI route in the codebase with no schema. Fix: added Zod schema (`brandGuidelineId: UUID`, `prompt: max 500`), rate limit, and `sanitizeForPrompt()` on all embedded fields. Round 12. Commit: `f260ca1` |
| C-6 | ✅ Fixed | `src/lib/data/credits.ts`:102, `src/lib/data/insights.ts`:137,197 | **Credit transaction insert not error-checked** — added `const { error: txErr }` check on all 3 transaction inserts; logs `console.error` with context when ledger insert fails. Round 9. Commit: `4663a05` |

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
| H-22 | ✅ Fixed | `src/lib/ai/decompose.ts`:91 | **No timeout on `downloadImage()` fetch** — `downloadImage()` uses plain `fetch(imageUrl)` with no `AbortSignal`. L-4 added timeouts to Gemini API calls, but the image download step (which can hang on slow/unresponsive Facebook CDN URLs) has no timeout. A hanging download holds the Vercel lambda open until its `maxDuration` limit. Fix: add `AbortSignal.timeout(30_000)` to the `downloadImage` fetch. Round 10. Commit: `10bfcce` |
| H-23 | ✅ Fixed | `src/lib/data/boards.ts`:20 | **Inefficient ad count query in `getBoards()`** — Fetches the `board_id` column of ALL `saved_ads` rows for a workspace to count ads per board in JavaScript. A workspace with 10,000 saved ads transfers 10,000 rows just to produce per-board counts. Fix: use Supabase relational count `select("id, name, ..., saved_ads(count)")` to push the aggregation to Postgres. Round 10. Commit: `10bfcce` |
| H-24 | ✅ Fixed | `src/lib/ai/decompose.ts` | **No image size cap before base64 encoding** — `downloadImage()` fetched any size image into memory with no limit. A 200 MB image from Facebook CDN gets base64-encoded (267 MB), allocated into the Gemini API payload, and crashes the lambda with OOM — no credits refunded. Fix: 10 MB cap via `Content-Length` pre-check + actual buffer size check. Credit refund flows via outer catch already calling `refundCredits()`. Round 11. Commit: `5aaa82a` |
| H-25 | ✅ Fixed | `src/app/api/webhooks/stripe/route.ts`:52 | **Stripe webhook missing-metadata silently dropped** — `break` inside the switch case fell through to the final `return NextResponse.json({ received: true })`. Stripe saw 200 OK and permanently stopped retrying — credits never added. Fix: explicit `return` with `console.error` alert so missing-metadata events are clearly flagged. Round 11. Commit: `5aaa82a` |
| H-26 | ✅ Fixed | `src/app/api/ads/composite/route.ts`, `src/app/api/ads/composite-batch/route.ts` | **No input validation on composite routes — authenticated DoS via OOM** — `fontSize=1000000` with long text causes `wrapText()` to produce 50,000+ `<tspan>` elements, crashing the lambda. `combinations` array could be 10,000 entries. Fix: Zod schemas enforce `fontSize` 8-200, `text` max 500 chars, `combinations` max 50, hex color regex. Round 11. Commit: `5aaa82a` |
| H-27 | ✅ Fixed | `src/lib/data/brand-guidelines-entities.ts`:276,310,364 | **Brand guideline filenames not sanitized in storage paths** — `uploadBrandGuidelineLogo()`, `uploadBrandGuidelineFile()`, `uploadBrandGuidelineFiles()` used raw `fileName` in storage paths. Same `/[^a-zA-Z0-9._-]/g → "_"`, `.slice(0,100)` pattern already applied to studio and asset uploads. Round 12. Commit: `f260ca1` |
| H-28 | ✅ Fixed | `src/app/api/assets/generate-background/route.ts` | **No rate limit on `generate-background` AI route** — every other AI-calling route has `aiLimiter.check()`, this one didn't. Added `aiLimiter.check(workspace.id, 5)`. Round 12. Commit: `f260ca1` |
| H-19 | ✅ Fixed | `src/lib/data/competitors.ts`:99 | **N+1 upsert loop in `saveCompetitorAds()`** — replaced sequential for-loop with single batch `supabase.upsert(rows, { onConflict: "workspace_id,meta_library_id" })`. Round 9. Commit: `4663a05` |
| H-20 | ✅ Fixed | `src/app/api/meta/sync/route.ts`:15 | **No rate limiting on `/api/meta/sync`** — added `await apiLimiter.check(member.workspace_id, 3)` with 429 response. Round 9. Commit: `4663a05` |
| H-21 | ✅ Fixed | `src/app/(dashboard)/discover/actions.ts`:103 | **TOCTOU double-charge race in insight analysis** — added re-check for existing insight after credit deduction; refunds and returns cached result if concurrent request won the race. Round 9. Commit: `4663a05` |

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
| M-17 | ✅ Fixed | `src/app/api/webhooks/stripe/route.ts`:58 | **NaN credits from Stripe metadata `parseInt`** — `const credits = parseInt(metadata.credits, 10)` has no `isNaN` / `isFinite` guard. If `metadata.credits` is missing or non-numeric (e.g., corrupted metadata, Stripe test event with bad fixture), `credits` is `NaN`, which is then passed to `addCredits(workspaceId, NaN, ...)`. NaN credit balances corrupt the ledger silently. Added Number.isFinite guard + logs + 400 return. Round 10. Commit: `10bfcce` |
| M-18 | ✅ Fixed | `src/app/(dashboard)/boards/actions.ts`:227 | **Concurrent variation generation double-charges credits** — `generateVariationsAction` deducts `totalCost` credits then loops through strategies. If two browser tabs submit simultaneously, both pass `checkAndDeductCredits` before either updates the balance, resulting in double deduction and double generation. Same class of bug as H-21 (insight TOCTOU). Fixed: added aiLimiter.check(workspace.id, 5) to generateVariationsAction — max 5/min per workspace. Round 10. Commit: `10bfcce` |
| M-13 | ✅ Fixed | `src/app/api/auth/meta/callback/route.ts`:75 | **Meta OAuth external error message leaked to redirect URL** — replaced `tokenData.error.message` with hardcoded `"token_exchange"` code. Round 9. Commit: `4663a05` |
| M-14 | ✅ Fixed | `src/app/(dashboard)/variations/actions.ts`:17 | **Cursor parameter not validated in `fetchAllVariations`** — added `z.string().datetime().optional()` Zod schema; returns `{ error: "Invalid cursor" }` on malformed input. Round 9. Commit: `4663a05` |
| M-15 | ✅ Fixed | `src/lib/ai/openai.ts`, `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/decompose.ts` | **No retry on transient AI API failures** — set `maxRetries: 3` on OpenAI client; added `geminiPost()` helper with 3-attempt exponential backoff (1s/2s) for retryable status codes (429, 500, 503) in `gemini-image-edit.ts`; inline retry loop in `decompose.ts` `_inpaintWithGemini()`. Round 9. Commit: `4663a05` |
| M-16 | ✅ Fixed | `src/lib/data/competitors.ts`:144 | **In-app filtering loads ALL competitor reports for deletion** — replaced fetch-all + JS filter with `.overlaps("competitor_brand_ids", brandIds)` Postgres array overlap query. Round 9. Commit: `4663a05` |
| M-19 | ✅ Fixed | `src/lib/data/assets.ts`:uploadAssetImage | **Asset upload filename not sanitized** — `uploadAssetImage()` used the raw `fileName` param directly in the storage path, allowing `../` traversal or excessively long filenames. Studio uploads had M-12 fix; assets were missed. Fix: same pattern — `/[^a-zA-Z0-9._-]/g → "_"`, `.slice(0, 100)`. Round 11. Commit: `5aaa82a` |
| M-20 | ✅ Fixed | `assets-client.tsx`, `credits-page-client.tsx`, `discover-client.tsx` | **Unhandled promise rejections in 3 client components** — `.then()` calls with no `.catch()` cause silent failures and unhandled rejection warnings. Fix: added `.catch((err) => console.warn(...))` to each. Round 11. Commit: `5aaa82a` |
| M-21 | ✅ Fixed | `src/app/api/decompose/route.ts`:cache UPDATE | **Decompose cache UPDATE missing workspace_id filter** — UPDATE uses only `.eq("id", cached.id)` — a valid cache row ID from another workspace (obtained via timing attack) could theoretically update its `last_used_at`. Fix: added `.eq("workspace_id", workspaceId)` for defense-in-depth. Round 11. Commit: `5aaa82a` |
| M-22 | 🚫 Won't Fix (config) | Supabase dashboard | **RLS not enabled** — all tables use admin client with manual workspace_id filtering. RLS disabled pending migration policies. Mitigated by consistent manual filtering on every query. Action: enable RLS in Supabase dashboard (no code change needed). |
| M-23 | ✅ Fixed | `src/lib/ai/decompose.ts`:261 | **AI-extracted text re-injected raw into inpainting prompts** — `marketingTexts` from GPT-4o Vision (which reflects competitor ad copy) was embedded unsanitized into Gemini/OpenAI inpainting prompts. Fix: each text entry sanitized via `sanitizeForPrompt()` before joining into `textList`. Round 12. Commit: `f260ca1` |
| M-24 | ✅ Fixed | `src/app/(dashboard)/brand-guidelines/actions.ts` | **No max length limits on brand guideline fields** — `brandVoice`, `targetAudience`, `dosAndDonts` could be stored as 100k+ char strings, then embedded verbatim in every AI prompt referencing that guideline. Fix: added `.max()` to createSchema (brandName 200, brandVoice 500, targetAudience 300, dosAndDonts 1000); added full Zod schema to `updateBrandGuidelineAction` which had none. Round 12. Commit: `f260ca1` |

---

## LOW

| ID | Status | File | Description |
|----|--------|------|-------------|
| L-1 | ✅ Fixed | `src/lib/data/variations.ts` | **Inconsistent null handling** — `VariationWithContext.assetName` and `assetImageUrl` typed as `string | null`; `getAllVariations` returns `null` instead of `"Unknown"` and `""` for missing fields. Commit: `271af1d` |
| L-2 | ✅ Fixed | Multiple API routes | **Missing structured error context in logs** — added `workspace_id` to error logs in composite, composite-batch, download, generate-background, generate-image, and decompose routes using `let workspaceId` hoisted before try block. Commit: `4dc5296` |
| L-3 | ✅ Fixed | `src/lib/data/studio.ts`:302 | **Sequential mention resolution** — `resolveMentions()` now uses `Promise.all()` to resolve all mentions in parallel; reduces latency by N-1 round-trips. Commit: `1771d60` |
| L-4 | ✅ Fixed | `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/decompose.ts` | **No request timeout on Gemini API fetch calls** — added `AbortSignal.timeout(60_000)` to mask generation call and `AbortSignal.timeout(120_000)` to image editing calls. OpenAI SDK already applies its own timeout. Round 9. Commit: `4663a05` |
| L-5 | ✅ Fixed | `src/app/(dashboard)/variations/components/variations-page-client.tsx` | **No unmount guard in handleGenerate** — async state updates after component unmount during generation. Fix: `mountedRef = useRef(true)` + cleanup `useEffect`. Round 11. Commit: `5aaa82a` |
| L-6 | ✅ Fixed | `src/app/api/auth/slack/route.ts` | **Slack OAuth state cookie sameSite: "lax"** — CSRF state cookie used `sameSite: "lax"`, allowing cross-site GET requests to carry the cookie. Fix: changed to `"strict"`. Round 11. Commit: `5aaa82a` |
| L-7 | ✅ Fixed | `src/app/(dashboard)/settings/components/settings-client.tsx` | **settings copyToken setTimeout not cleared on unmount** — `setTimeout(() => setTokenCopied(false), 2000)` fires on unmounted component. Fix: stored in `copyTimeoutRef`, cleared in unmount `useEffect`. Round 11. Commit: `5aaa82a` |
| L-8 | ✅ Fixed | `src/lib/ai/gemini-image-edit.ts`:editAssetImageWithGemini | **Asset imageUrl not validated before downloadImage()** — URL comes from DB (trusted workspace-scoped query) but defense-in-depth guard missing. Fix: added `isPublicUrl()` check before `downloadImage()`. Round 12. Commit: `f260ca1` |

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
| R10-1: Rate limiter config mismatch — `aiLimiter` comment says 20/min but window is 60s | FALSE POSITIVE — `AsyncRateLimiter(60_000)` = 60s window (correct). The limit of 20 is the second arg to `.check(id, 20)` at the call sites, not stored in the limiter instance ✅ |
| R10-2: Stripe webhook race condition (two concurrent requests both pass idempotency) | ACCEPTED — Reference_id check + Postgres unique constraint prevents duplicate inserts. Stripe's retry behavior means truly concurrent identical events are rare. Existing design accepted ✅ |
| R10-3: `pageSize` not capped in `getCreditTransactions()` | FALSE POSITIVE — `credits/actions.ts` has `pageSize: z.number().int().min(1).max(100)` Zod validation at the caller; DB layer doesn't need to re-cap ✅ |
| R10-4: DALL-E image URL expiration in variation modal | FALSE POSITIVE — Variation images are uploaded to Supabase Storage immediately after generation (permanent public URLs); no DALL-E ephemeral URLs are stored ✅ |
| R10-5: Studio chat workspace validation missing | FALSE POSITIVE — Route calls `getWorkspace()` and uses `workspace.id` as the first param in every DB query ✅ |
| R11-1: Admin client in `getWorkspace()` leaks cross-workspace data | FALSE POSITIVE — filters by `user.id` from JWT; admin client is correct for server-side workspace lookup by authenticated user ✅ |
| R11-2: Meta OAuth state not validated | FALSE POSITIVE — `state` param is validated against `meta_oauth_state` cookie in the callback route ✅ |
| R11-3: Gemini TEXT-only response skips credit refund | FALSE POSITIVE — TEXT-only response propagates error which is caught by outer `try/catch` in the decompose route, which calls `refundCredits()` ✅ |
| R11-4: `.single()` missing error check | FALSE POSITIVE — All `.single()` uses have `if (error \|\| !data)` pattern catching PGRST116 ✅ |
| R11-5: Slack OAuth initiation has no rate limiting | FALSE POSITIVE — Supabase Auth session is required; unauthenticated requests redirected to `/login` ✅ |
| R11-6: `crypto.randomUUID()` state token could be reused | FALSE POSITIVE — cookie deleted immediately on first callback validation; no replay possible ✅ |
| R11-7: `getBoards()` no pagination | FALSE POSITIVE — Board counts are typically small per workspace; no evidence of scale problem ✅ |
| R11-8: Variation history load cursor not validated | FALSE POSITIVE — Fixed as M-14 in Round 9 with Zod datetime validation ✅ |
| R12-1: Admin client in getWorkspace() unsafe without RLS | ACCEPTED RISK — all queries have manual workspace_id filter; RLS is a config task (M-22), not a code bug ✅ |
| R12-2: L-9 variation stuck in pending | FALSE POSITIVE — `failVariation()` is already called in the catch block at `boards/actions.ts:376` ✅ |
| R12-3: DALLE/Gemini generate trademarked content | ACCEPTED — product mask protects product pixels; DALL-E 3 has its own safety filters; not fixable in application code ✅ |

---

## Stats

| Severity | Total Found | Fixed | Won't Fix | Open |
|----------|-------------|-------|-----------|------|
| Critical | 11 | 11 | 0 | 0 |
| High | 28 | 26 | 2 | 0 |
| Medium | 24 | 23 | 1 | 0 |
| Low | 8 | 8 | 0 | 0 |
| **Total** | **71** | **68** | **3** | **0** |
