# PHASE 23: MCP SERVER — VOLTIC AS AN AI TOOL

> **Prerequisites:** Phase 22 complete. Read CLAUDE.md and PROGRESS.md before starting.

**Goal:** Expose Voltic's capabilities as MCP (Model Context Protocol) tools so Claude Cowork, Claude Code, and any MCP-compatible agent can programmatically scrape ads, download media, analyze creatives, and generate hooks without touching the UI. This replaces the manual Cowork + Chrome Extension workaround with a native integration.

**Estimated effort:** 4 hours

**Context:** The codebase already has a clean `lib/data/*` layer (60+ exported functions) and `lib/ai/*` layer (decompose, variations, comparison, insights, creative-enhance, competitor-report) fully decoupled from the UI. The MCP server is a thin wrapper over these existing functions with an API key auth layer.

---

## 23A. New Dependencies

```bash
npm install @modelcontextprotocol/sdk
```

Add to `.env.local`:
```
VOLTIC_MCP_API_KEY=vlt_sk_... (generate a secure random key)
```

## 23B. MCP API Key Auth — `lib/mcp/auth.ts`

MCP clients don't have browser sessions. Create a lightweight API key auth system.

### Database — `mcp_api_keys` table

Add to `src/db/schema.ts`:

```
mcp_api_keys:
- id: uuid (pk)
- workspace_id: uuid (fk → workspaces.id)
- key_hash: text (SHA-256 of the API key — never store plaintext)
- name: text (e.g., "Claude Cowork", "n8n Production")
- scopes: text[] (e.g., ['read', 'write', 'ai'] — for future granular permissions)
- last_used_at: timestamptz (nullable)
- expires_at: timestamptz (nullable)
- is_active: boolean (default true)
- created_at: timestamptz
```

Generate Drizzle migration.

### Auth helper

```typescript
// lib/mcp/auth.ts
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function resolveWorkspaceFromApiKey(apiKey: string): Promise<{
  workspaceId: string
  scopes: string[]
} | null> {
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('mcp_api_keys')
    .select('workspace_id, scopes, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()
  
  if (!data || !data.is_active) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  
  // Update last_used_at
  await admin
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)
  
  return { workspaceId: data.workspace_id, scopes: data.scopes }
}
```

## 23C. MCP Server Endpoint — `src/app/api/mcp/route.ts`

Single SSE (Server-Sent Events) endpoint implementing the MCP protocol:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
```

The route handles:
- `GET /api/mcp` — SSE connection (MCP handshake + tool listing)
- `POST /api/mcp` — Tool invocations (MCP messages)

Auth flow per request:
1. Extract API key from `Authorization: Bearer vlt_sk_...` header
2. Call `resolveWorkspaceFromApiKey()` to get workspace_id
3. Pass workspace_id to every tool handler (all data scoped to that workspace)
4. Return 401 if key invalid/expired/inactive

## 23D. MCP Tool Definitions — `lib/mcp/tools/`

Each file exports tool definitions that wrap existing lib/ functions. The workspace_id is injected by the server — tools never need to handle auth themselves.

### `discover.ts` — Ad Library Search & Scraping

```
Tool: search_ads
  Description: "Search Meta Ads Library for a brand's ads. Returns ad metadata including headline, body, format, platforms, runtime, dates, thumbnail URL, and Ads Library link."
  Params:
    brand_name: string (required)
    country: string (default "ALL", ISO 2-letter code)
    media_type: 'all' | 'image' | 'video' (default 'all')
    limit: number (default 20, max 100)
    active_only: boolean (default true)
  Wraps: searchAdsLibrary() from lib/data/discover.ts
  Returns: Array of ad objects with all metadata
```

### `media.ts` — Asset Download (THE MISSING PIECE)

```
Tool: download_ad_media
  Description: "Download the actual image or video file from an ad and store it in Voltic's storage. Returns a permanent storage URL. This eliminates the need to manually download via browser or Chrome Extension."
  Params:
    media_url: string (required — the fbcdn.net or CDN URL from scraper results)
    brand_name: string (required)
    ad_index: number (optional — for numbered filenames like AG1_1.mp4)
    media_type: 'image' | 'video' (required)
  Logic:
    1. Fetch the media URL with timeout (30s images, 120s video)
    2. Validate Content-Type matches expected media_type
    3. Cap video files at 100MB
    4. Generate filename: {brand}_{index}.{ext} (e.g., AG1_1.mp4, AG1_2.png)
    5. Upload to Supabase Storage: competitor-media/{workspace_id}/{brand}/{filename}
    6. For video: extract a thumbnail frame at 1s using Sharp
    7. Record in downloaded_media table
    8. Return: { storage_url, thumbnail_url, file_size, media_type, filename }
  Wraps: NEW function downloadAndStoreMedia() in lib/media/download.ts

Tool: download_competitor_ads_batch
  Description: "Download all media assets from a competitor scrape in one call. Processes in parallel batches. Stores all files and returns a summary with permanent URLs."
  Params:
    brand_name: string (required)
    ads: Array<{ media_url: string, media_type: string, ad_title?: string }> (required)
    max_concurrent: number (default 5)
  Logic:
    1. Process ads in parallel batches (5 at a time)
    2. Download each, upload to Supabase Storage
    3. Handle individual failures gracefully (continue on error)
    4. Return: { total, downloaded, failed, files: Array<{ filename, storage_url, size }> }
  This replaces the Cowork + Chrome Extension workflow for downloading 84 videos.
```

### `boards.ts` — Board Management

```
Tool: list_boards
  Description: "List all boards in the workspace with their ad counts."
  Params: none (workspace-scoped via API key)
  Wraps: getBoards() from lib/data/boards.ts

Tool: save_to_board
  Description: "Save an ad to a board."
  Params:
    board_id: string (required)
    ad: { headline, body, format, image_url, video_url?, landing_page_url?, brand_name, platforms? }
  Wraps: saveAdToBoard() from lib/data/discover.ts

Tool: create_board
  Description: "Create a new board."
  Params: { name: string, description?: string }
  Wraps: createBoard() from lib/data/boards.ts
```

### `decompose.ts` — Ad Image Analysis

```
Tool: decompose_ad
  Description: "Analyze an ad image using AI vision. Extracts all text (headline, CTA, body), identifies the product, background, and layout style. Costs 5 credits."
  Params:
    image_url: string (required)
    generate_clean_image: boolean (default false, +5 credits)
  Wraps: decomposeAdImage() from lib/ai/decompose.ts
  Returns: DecompositionResult
```

### `analytics.ts` — Performance Data

```
Tool: get_dashboard_kpis
  Description: "Get aggregate KPIs across all connected Meta ad accounts."
  Params:
    period: 'today' | 'yesterday' | 'last_7d' | 'last_30d' (default 'today')
  Wraps: getWorkspaceKPIs() from lib/data/dashboard.ts

Tool: get_report
  Description: "Get a performance report (top ads, campaigns, creatives, landing pages, headlines, or copy)."
  Params:
    type: 'top_ads' | 'top_campaigns' | 'top_creatives' | 'top_landing_pages' | 'top_headlines' | 'top_copy' (required)
    period: 'today' | 'yesterday' | 'last_7d' | 'last_30d' (default 'last_7d')
    limit: number (default 25)
  Wraps: getTopAdsReport() / getTopCampaignsReport() / etc. from lib/data/reports.ts
```

### `competitors.ts` — Competitor Intelligence

```
Tool: list_competitors
  Description: "List all tracked competitor brands."
  Wraps: listCompetitorBrands() from lib/data/competitors.ts

Tool: generate_competitor_report
  Description: "Generate an AI competitor analysis report comparing tracked competitors."
  Params:
    brand_names: string[] (required)
    include_ads: boolean (default true)
  Wraps: generateCompetitorReport() from lib/ai/competitor-report.ts
```

### `creative.ts` — AI Creative Generation

```
Tool: generate_variations
  Description: "Generate creative text variations (headline + body) for an ad using a copywriting strategy."
  Params:
    ad: { headline: string, body: string } (required)
    strategy: 'hero_product' | 'curiosity' | 'pain_point' | 'proof_point' | 'text_only' (required)
    brand_guidelines_id: string (optional — pulls stored brand guidelines)
  Wraps: generateVariationText() from lib/ai/variations.ts

Tool: analyze_ad
  Description: "Get AI insights on an ad's creative effectiveness."
  Params:
    ad: { headline: string, body: string, format?: string }
  Wraps: generateAdInsights() from lib/ai/insights.ts

Tool: compare_ads
  Description: "Compare two ads side-by-side and get strategic analysis."
  Params:
    ad_a: { headline, body, format? }
    ad_b: { headline, body, format? }
  Wraps: generateAdComparison() from lib/ai/comparison.ts
```

## 23E. New Database Table + Storage

### `downloaded_media` table

Add to `src/db/schema.ts`:

```
downloaded_media:
- id: uuid (pk)
- workspace_id: uuid (fk)
- brand_name: text
- original_url: text
- storage_url: text (Supabase Storage URL)
- thumbnail_url: text (nullable — for videos)
- media_type: text ('image' | 'video')
- file_size: integer (bytes)
- filename: text
- metadata: jsonb (ad_title, runtime, format, etc.)
- created_at: timestamptz
```

Generate Drizzle migration.

### Supabase Storage

Create bucket: `competitor-media` (public, 500MB file size limit)

## 23F. Media Download Service — `lib/media/download.ts`

### Single download

```typescript
export async function downloadAndStoreMedia(params: {
  mediaUrl: string
  workspaceId: string
  brandName: string
  mediaType: 'image' | 'video'
  adIndex?: number
  metadata?: Record<string, unknown>
}): Promise<{
  storage_url: string
  thumbnail_url: string | null
  file_size: number
  filename: string
}>
```

Logic:
1. Fetch media URL with timeout (30s images, 120s video)
2. Validate Content-Type matches expected media_type
3. For video: cap at 100MB per file
4. Generate filename: `{brand}_{index}.{ext}` (e.g., AG1_1.mp4)
5. Upload to Supabase Storage at `competitor-media/{workspace_id}/{brand}/{filename}`
6. For video: extract thumbnail at 1s mark using Sharp
7. Insert record in downloaded_media table
8. Return storage URL, thumbnail, filesize

### Batch download

```typescript
export async function downloadBatchMedia(params: {
  workspaceId: string
  brandName: string
  ads: Array<{ mediaUrl: string, mediaType: string, title?: string }>
  maxConcurrent?: number  // default 5
}): Promise<{
  total: number
  downloaded: number
  failed: number
  files: Array<{ filename: string, storage_url: string, size: number }>
  errors: Array<{ index: number, error: string }>
}>
```

Processes in parallel batches. Handles individual failures gracefully (continue on error).

## 23G. Settings UI — API Key Management

Add to `(dashboard)/settings/components/`:

### `mcp-keys-card.tsx`

"MCP API Keys" card in Settings page:
- List existing keys: name, scopes, last used, created date, status badge
- "Create API Key" button → modal:
  - Name input (e.g., "Claude Cowork", "n8n Production")
  - Scopes: checkboxes (Read, Write, AI)
  - On create: shows generated key ONCE (vlt_sk_...)
  - Warning: "This key will only be shown once. Copy it now."
  - Copy button with success indicator
- Delete key with confirmation dialog
- Copy MCP endpoint URL button: `https://your-domain.com/api/mcp`

### Quick-start instructions panel

Show users what to add to their Claude Desktop or Cowork config:

```json
{
  "mcpServers": {
    "voltic": {
      "url": "https://your-voltic-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer vlt_sk_your_key_here"
      }
    }
  }
}
```

## 23H. PostHog Events

- `mcp_key_created` with `{ name, scopes }`
- `mcp_key_deleted` with `{ key_id }`
- `mcp_tool_invoked` with `{ tool_name, duration_ms, status }`
- `mcp_media_downloaded` with `{ brand, media_type, file_size }`
- `mcp_batch_download_completed` with `{ brand, total, downloaded, failed, total_size_mb }`

---

## VERIFY:
- [ ] MCP SSE endpoint responds at /api/mcp
- [ ] API key creation works — key shown once, hash stored in database
- [ ] API key auth resolves to correct workspace_id
- [ ] Invalid/expired/inactive keys return 401
- [ ] `search_ads` tool returns ad metadata from Ads Library
- [ ] `download_ad_media` downloads an image and stores in Supabase Storage with permanent URL
- [ ] `download_ad_media` downloads a video and stores with auto-generated thumbnail
- [ ] `download_competitor_ads_batch` processes multiple ads in parallel (test with 10+ ads)
- [ ] Downloaded files accessible via storage URLs
- [ ] `list_boards`, `save_to_board`, `create_board` work through MCP
- [ ] `decompose_ad` runs vision analysis through MCP
- [ ] `get_dashboard_kpis` returns correct KPI data through MCP
- [ ] `get_report` returns correct report data for each report type
- [ ] `generate_variations` creates text variations through MCP
- [ ] `analyze_ad` and `compare_ads` return insights through MCP
- [ ] `list_competitors` and `generate_competitor_report` work through MCP
- [ ] Settings page shows API key management card with create/delete/copy
- [ ] Quick-start config panel shows correct MCP server configuration
- [ ] MCP endpoint discoverable by Claude Desktop/Cowork (test connection)
- [ ] **End-to-end test from Claude Cowork:** "Search for AG1 ads and download the top 10 videos" completes successfully
- [ ] PostHog events fire for all MCP tool invocations
- [ ] Rate limiting works on MCP endpoint (prevent abuse)
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 23 ✅
Commit: `feat: MCP server with 12 tools, API key auth, media download, and settings UI`
