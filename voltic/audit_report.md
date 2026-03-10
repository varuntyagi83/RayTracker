# Voltic QA Audit Report — Phase 23: MCP Server (Re-Audit)

**Auditor:** Vera Thornton, Principal QA Engineer
**Date:** 2026-03-10
**Verdict:** ✅ GO with conditions (fix M-P23R-1 before enabling download tools in prod)

---

## Issue Summary

| ID | Severity | File | Description |
|----|----------|------|-------------|
| M-P23R-1 | MEDIUM | `src/lib/media/download.ts:160` | SSRF bypass via redirect following — `fetch()` follows HTTP redirects; `isPublicUrl()` only validates the initial URL |
| L-P23R-1 | LOW | `mcp-keys-card.tsx:284` | Key name `<Input>` missing `maxLength={100}` — server rejects >100 chars but client allows unlimited typing |
| L-P23R-2 | LOW | `migrations/008_mcp_server.sql` | Missing UPDATE RLS policy on `mcp_api_keys` — works now (admin client bypasses RLS) but defensive gap |
| L-P23R-3 | LOW | `migrations/008_mcp_server.sql:32` | `downloaded_media.media_type` has no `CHECK` constraint — application validates, DB does not |

---

## Previously Fixed Issues (all verified ✅)

| ID | Was | Status |
|----|-----|--------|
| H-P23-1 | `sort_key` no allowlist | ✅ Fixed — `VALID_SORT_KEYS` const with 10 values |
| H-P23-2 | CORS missing on GET/POST | ✅ Fixed — `CORS_HEADERS` applied to all responses |
| M-P23-1 | `requireScope` empty bypass | ✅ Fixed — `!scopes.includes(scope)` deny-by-default |
| M-P23-2 | R2 orphaned files | ✅ Fixed — `DeleteObjectCommand` on DB insert failure |
| M-P23-3 | Date params unvalidated | ✅ Fixed — regex + from≤to check |
| L-P23-1 | `require("crypto")` in ESM | ✅ Fixed — top-level ESM import |
| L-P23-2 | Missing toggle analytics | ✅ Fixed — `trackServer("mcp_key_toggled", …)` |
| L-P23-3 | No input length limits | ✅ Fixed — guards on query/name/headline/body |
| L-P23-4 | R2 env vars undocumented | ✅ Fixed — R2 section in `.env.example` |

---

## Detailed Findings

### M-P23R-1 — SSRF via Redirect Following (MEDIUM)
**File:** [src/lib/media/download.ts:160](src/lib/media/download.ts#L160)

`fetch()` follows HTTP redirects by default. `isPublicUrl()` only validates the initial URL, not intermediate redirect targets. A public HTTPS URL that issues a 302 to `http://169.254.169.254/latest/meta-data` (AWS metadata endpoint) or any RFC-1918 address bypasses all SSRF guards.

**Evidence:**
```ts
const response = await fetch(mediaUrl, {
  signal: AbortSignal.timeout(timeoutMs),
  // no redirect option — defaults to "follow"
});
```

**Fix:** Add `redirect: "error"` to block all redirects:
```ts
const response = await fetch(mediaUrl, {
  signal: AbortSignal.timeout(timeoutMs),
  redirect: "error",
});
```
Legitimate CDN media URLs rarely require redirect-following. If redirects are needed for specific CDNs, implement `redirect: "manual"` with `isPublicUrl()` re-validation on the `Location` header before following.

---

### L-P23R-1 — Missing maxLength on Key Name Input (LOW)
**File:** [src/app/(dashboard)/settings/components/mcp-keys-card.tsx:284](src/app/(dashboard)/settings/components/mcp-keys-card.tsx#L284)

The name `<Input>` has no `maxLength` prop. The server action rejects names over 100 characters (Zod schema), but the client allows unlimited text entry, causing confusing submit failures.

**Fix:** Add `maxLength={100}` to the `<Input>`.

---

### L-P23R-2 — Missing UPDATE RLS Policy on mcp_api_keys (LOW)
**File:** [supabase/migrations/008_mcp_server.sql](supabase/migrations/008_mcp_server.sql)

RLS has SELECT/INSERT/DELETE policies but no UPDATE policy. Toggle and `last_used_at` operations work because they use `createAdminClient()` (service role bypasses RLS), but this is a defensive gap.

**Fix:** Add to the next migration:
```sql
CREATE POLICY "Members can update mcp api keys" ON public.mcp_api_keys
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));
```

---

### L-P23R-3 — No CHECK Constraint on media_type (LOW)
**File:** [supabase/migrations/008_mcp_server.sql:32](supabase/migrations/008_mcp_server.sql#L32)

`media_type TEXT NOT NULL` with no DB-level constraint. Application validates `'image'|'video'`, but the DB accepts any string via direct SQL or admin console.

**Fix:**
```sql
media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
```

---

## Verified Clean

- Auth on all endpoints (Bearer → SHA-256 hash → DB lookup)
- Scope enforcement deny-by-default (empty scopes = no access)
- CORS headers on all GET/POST/OPTIONS responses
- SSRF initial-URL validation (loopback, RFC-1918, IPv6 private, .local)
- File size caps (25MB image / 100MB video)
- Content-Type validation matches expected `mediaType`
- R2 orphan cleanup on DB insert failure
- sort_key allowlist (10 values)
- Date format + range validation
- Rate limiting (60 req/min per workspace, Upstash Redis / in-memory fallback)
- RLS enabled with workspace-scoped policies on both tables
- Raw API key never stored after dialog close; confirm-before-done UX
- ESM imports throughout (no CommonJS `require()`)
- PostHog analytics on create, delete, and toggle key events
- Input length limits on free-text MCP tool parameters
- R2 env vars documented in `.env.example`
