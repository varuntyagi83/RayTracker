# PHASE 24: VIDEO AD ANALYSIS & HOOKS GENERATION PIPELINE

> **Prerequisites:** Phase 23 complete (MCP server + media download working). Read CLAUDE.md and PROGRESS.md before starting.

**Goal:** Build the video analysis pipeline that replaces the manual Cowork competitor research workflow. Takes downloaded competitor videos, analyzes them using Gemini Flash (default) or GPT-4o Vision (premium), extracts hooks/CTAs/narrative structure, and generates a hooks matrix + creative briefs for YOUR brand — all accessible via the UI and through MCP tools.

**Estimated effort:** 5 hours

**Context:** This phase produces the exact same output as the Cowork competitor research skill (hooks matrix CSV with competitor, hook_type, hook_text, rationale, target_emotion, suggested_format) but makes it native to Voltic — one-click from the UI or a single MCP command. Both `@ai-sdk/google` (Gemini) and `@ai-sdk/openai` (GPT-4o) are already in your dependencies.

---

## 24A. Video Analysis Service — `lib/ai/video-analysis.ts`

Two provider options using the Vercel AI SDK already installed:

### Gemini Flash 2.0 (default — cheap, native video support)

```typescript
import { google } from '@ai-sdk/google'

export async function analyzeVideoWithGemini(params: {
  videoUrl: string       // Supabase Storage URL from Phase 23 download
  brandName: string
  analysisDepth: 'quick' | 'detailed'
}): Promise<VideoAnalysisResult>
```

- Send video directly to Gemini (native video input — no frame extraction needed)
- Max video length: 2 minutes (truncate longer ones)
- Cost: ~$0.01-0.05 per video
- Best for: bulk analysis, quick scans, budget-conscious runs

### GPT-4o Vision (premium — frame extraction, most accurate)

```typescript
import { openai } from '@ai-sdk/openai'

export async function analyzeVideoWithGPT4o(params: {
  videoUrl: string
  brandName: string
  frameCount?: number   // default 8 frames
}): Promise<VideoAnalysisResult>
```

- Extract N frames at equal intervals using Sharp
- Send frames as images to GPT-4o Vision
- Higher accuracy on text extraction and scene transitions
- Cost: ~$0.05-0.15 per video
- Best for: deep analysis of specific high-performing ads

### Shared Router

```typescript
export async function analyzeVideoAd(params: {
  videoUrl: string
  brandName: string
  provider: 'gemini' | 'gpt4o'
  depth: 'quick' | 'detailed'
}): Promise<VideoAnalysisResult> {
  // Routes to the correct provider
}
```

### Shared Output Type

```typescript
interface VideoAnalysisResult {
  hook: {
    text: string                    // First 3 seconds — the opening hook
    type: 'curiosity' | 'pain_point' | 'social_proof' | 'urgency' | 'contrarian' | 'authority' | 'storytelling' | 'shock' | 'question' | 'statistic'
    strength: 'strong' | 'medium' | 'weak'
    scroll_stop_score: number       // 1-10 rating on how likely to stop the scroll
  }
  narrative: {
    structure: 'problem_solution' | 'testimonial' | 'demonstration' | 'before_after' | 'listicle' | 'story_arc' | 'ugc_style'
    scenes: Array<{
      timestamp_start: number        // seconds
      timestamp_end: number
      description: string
      text_on_screen: string | null
      scene_type: 'hook' | 'problem' | 'solution' | 'proof' | 'cta' | 'transition'
    }>
    pacing: 'fast' | 'medium' | 'slow'
    estimated_duration: number       // seconds
  }
  cta: {
    text: string                     // The call to action
    type: 'shop_now' | 'learn_more' | 'sign_up' | 'send_message' | 'get_offer' | 'custom'
    placement: 'end' | 'middle' | 'throughout' | 'button_only'
  }
  brand_elements: {
    logo_visible: boolean
    product_shown: boolean
    product_description: string
    colors: string[]                 // Hex values
    tone: 'professional' | 'casual' | 'energetic' | 'calm' | 'urgent' | 'humorous'
  }
  text_overlays: Array<{
    text: string
    timestamp: number
    type: 'headline' | 'subtitle' | 'stat' | 'testimonial' | 'cta'
  }>
  competitive_insight: string        // 1-2 sentence strategic takeaway
}
```

### System Prompts

**Quick analysis prompt:**
```
You are an expert performance marketing analyst. Analyze this video advertisement and extract: (1) the opening hook (first 3 seconds), (2) the CTA, (3) key text overlays, and (4) a one-sentence competitive insight. Return ONLY valid JSON matching the schema.
```

**Detailed analysis prompt:**
```
You are an expert performance marketing analyst specializing in Meta ads creative strategy. Analyze this video advertisement frame by frame. Extract: (1) the opening hook with scroll-stop rating, (2) complete narrative structure with scene-by-scene breakdown and timestamps, (3) all CTAs and their placement, (4) brand elements including colors, tone, and product visibility, (5) every text overlay with timestamps, and (6) strategic competitive insights. Return ONLY valid JSON matching the schema.
```

## 24B. Hooks Generation Service — `lib/ai/hooks-generator.ts`

Takes video analyses across multiple competitors and generates hooks for YOUR brand:

```typescript
export async function generateHooksMatrix(params: {
  competitorAnalyses: Array<{
    brand: string
    videos: VideoAnalysisResult[]
  }>
  yourBrand: {
    name: string
    product_description: string
    brand_guidelines_id?: string    // Pull from existing brand guidelines table
    target_audience?: string
  }
  hookCount: number                 // How many hooks to generate (default 45)
  strategies: HookStrategy[]        // Which types to generate
}): Promise<HooksMatrixResult>
```

### Output — matches the Cowork CSV format exactly

```typescript
interface HooksMatrixResult {
  hooks: Array<{
    competitor_reference: string       // "AG1" — which competitor inspired this
    hook_type: string                  // curiosity, pain_point, social_proof, urgency, contrarian, etc.
    hook_text: string                  // The actual hook copy for your brand
    rationale: string                  // Why this works strategically
    target_emotion: string             // intrigue, frustration, trust, FOMO, etc.
    suggested_format: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  }>
  creative_briefs: Array<{
    title: string
    hook: string
    body: string
    cta: string
    format: string
    visual_direction: string
    competitor_inspiration: string
  }>
  competitive_insights: {
    summary: string
    patterns: string[]                 // Common patterns across competitors
    gaps: string[]                     // Opportunities competitors are missing
    recommendations: string[]          // Actionable recommendations for your brand
  }
}
```

### Generation Prompt

```
You are an elite performance marketing creative strategist. You have analyzed {N} video ads across {brands} competitors.

Based on these analyses, generate {hookCount} hooks for the brand "{yourBrand.name}" which sells: {yourBrand.product_description}. Target audience: {yourBrand.target_audience}.

{brandGuidelinesSection — injected from existing brand guidelines if ID provided}

For each hook, specify:
- competitor_reference: which competitor's approach inspired this
- hook_type: the copywriting strategy (curiosity, pain_point, social_proof, urgency, contrarian, authority, storytelling, statistic)
- hook_text: the actual hook copy written for {yourBrand.name}
- rationale: 1-2 sentences on why this works and what competitor insight it leverages
- target_emotion: the primary emotion this targets
- suggested_format: IMAGE, VIDEO, or CAROUSEL based on how this hook is best delivered

Also generate:
- 5 complete creative briefs (hook + body + CTA + visual direction)
- Competitive insights: common patterns, gaps, and strategic recommendations

Return ONLY valid JSON.
```

## 24C. Competitor Video Analysis Page

New sub-page: `(dashboard)/competitors/video-analysis/page.tsx`

### Page Header
"Video Ad Analysis" + "Analyze competitor video ads and generate hooks for your brand"

### Step 1 — Select Competitors
- Multi-select from tracked competitor brands (pull from existing competitors page data)
- "Or search new brand" option for one-time analysis
- Per-brand indicator: "{N} videos downloaded" (from downloaded_media table)
- "No videos yet — Download from Discover first" prompt if empty
- Quick "Download Videos" button that triggers MCP download_competitor_ads_batch inline

### Step 2 — Configure Analysis
- **AI Model selector** (radio cards):
  - Gemini Flash 2.0: "Recommended — native video, fastest, cheapest"
  - GPT-4o Vision: "Premium — frame extraction, most accurate for text-heavy ads"
- **Analysis depth:** Quick (hook + CTA only) | Detailed (full narrative breakdown)
- **Credit cost preview:** "{N} videos × {cost} credits = {total} credits"
- "Analyze Videos" button

### Step 3 — Real-time Results
Progress bar: "Analyzing {completed}/{total} videos..."

As each video completes, a card appears:
- Video thumbnail (from downloaded_media.thumbnail_url)
- Brand name, video title, runtime
- **Hook type badge** (color-coded: curiosity=blue, pain_point=red, social_proof=green, urgency=orange, contrarian=purple)
- Hook text (quoted)
- **Scroll-stop score** (1-10, color gradient: red=low, yellow=mid, green=high)
- CTA badge
- Expandable section: full narrative breakdown, scene-by-scene timeline, text overlays

### Step 4 — Generate Hooks for Your Brand
Appears after analysis completes:
- "Generate Hooks Matrix" button (sparkle icon)
- Select your brand: dropdown from brand guidelines, or enter name + description
- Hook count: 15 / 30 / 45 / custom number input
- Strategy checkboxes: curiosity, pain_point, social_proof, urgency, contrarian, authority, storytelling, statistic
- Credit cost preview
- "Generate" button

### Results View (matches Cowork output)

**Hooks Matrix tab:**
Sortable, filterable table:
| # | Competitor | Hook Type | Hook Text | Rationale | Emotion | Format |
Filters: by competitor, by hook_type, by format
Sort: by any column

**Creative Briefs tab:**
Expandable cards with full brief (title, hook, body, CTA, format, visual direction, competitor inspiration)

**Competitive Insights tab:**
Summary card + patterns list + gaps list + recommendations list

**Export bar (sticky bottom):**
- "📥 Download CSV" — hooks matrix as CSV (matches Cowork Hooks Matrix CSV format)
- "📥 Download JSON" — full raw data
- "📥 Download MD" — formatted markdown report
- "🎨 Open in Creative Studio" — pre-populate studio with hooks
- "📤 Send to Slack" — send via existing Slack automation template

## 24D. Database Tables

### `video_analyses` table

Add to `src/db/schema.ts`:

```
video_analyses:
- id: uuid (pk)
- workspace_id: uuid (fk)
- downloaded_media_id: uuid (fk → downloaded_media.id)
- brand_name: text
- provider: text ('gemini' | 'gpt4o')
- analysis_depth: text ('quick' | 'detailed')
- hook: jsonb (hook object from VideoAnalysisResult)
- narrative: jsonb (narrative object)
- cta: jsonb (cta object)
- brand_elements: jsonb
- text_overlays: jsonb
- competitive_insight: text
- credits_used: integer
- processing_status: text ('pending' | 'analyzing' | 'completed' | 'failed')
- error_message: text (nullable)
- duration_ms: integer
- created_at: timestamptz
```

### `hooks_matrix_runs` table

```
hooks_matrix_runs:
- id: uuid (pk)
- workspace_id: uuid (fk)
- competitor_brands: text[]
- video_analysis_ids: uuid[]
- your_brand_name: text
- brand_guidelines_id: uuid (nullable, fk → brand_guidelines.id)
- hook_count: integer
- strategies: text[]
- result: jsonb (full HooksMatrixResult)
- credits_used: integer
- created_at: timestamptz
```

Generate Drizzle migrations for both tables.

## 24E. MCP Tools — `lib/mcp/tools/video.ts`

Extend the Phase 23 MCP server with 3 new tools:

```
Tool: analyze_video_ad
  Description: "Analyze a competitor video ad using AI vision. Extracts the opening hook, narrative structure, CTA, brand elements, and all text overlays. Choose Gemini Flash for speed/cost or GPT-4o Vision for maximum accuracy."
  Params:
    video_url: string (required — Supabase Storage URL from download_ad_media)
    brand_name: string (required)
    provider: 'gemini' | 'gpt4o' (default 'gemini')
    depth: 'quick' | 'detailed' (default 'quick')
  Returns: VideoAnalysisResult

Tool: analyze_competitor_videos_batch
  Description: "Analyze ALL downloaded videos for a competitor brand. Runs analysis on every video in the downloaded_media table for that brand."
  Params:
    brand_name: string (required)
    provider: 'gemini' | 'gpt4o' (default 'gemini')
    depth: 'quick' | 'detailed' (default 'quick')
    max_concurrent: number (default 3)
  Logic: Query downloaded_media for brand → run analyzeVideoAd on each → return array
  Returns: { analyzed: number, failed: number, results: VideoAnalysisResult[] }

Tool: generate_hooks_matrix
  Description: "Generate a hooks matrix with creative briefs based on competitor video analyses. Outputs hooks written in your brand's voice, optionally using your stored brand guidelines. This is the final step of the competitor research pipeline."
  Params:
    competitor_brands: string[] (required)
    your_brand: { name: string, product_description: string, target_audience?: string } (required)
    brand_guidelines_id: string (optional — pulls stored brand guidelines for voice/tone)
    hook_count: number (default 45)
    strategies: string[] (default all types)
  Returns: HooksMatrixResult
```

**The complete MCP pipeline (replaces the entire Cowork session):**
```
Human: "Search for AG1, Huel, and Bloom Nutrition ads. Download all their videos. 
        Analyze every video. Then generate 45 hooks for my brand Sunday Natural 
        targeting health-conscious professionals."

Claude calls:
  1. search_ads({ brand_name: "AG1", media_type: "video" })
  2. search_ads({ brand_name: "Huel", media_type: "video" })
  3. search_ads({ brand_name: "Bloom Nutrition", media_type: "video" })
  4. download_competitor_ads_batch({ brand_name: "AG1", ads: [...] })
  5. download_competitor_ads_batch({ brand_name: "Huel", ads: [...] })
  6. download_competitor_ads_batch({ brand_name: "Bloom Nutrition", ads: [...] })
  7. analyze_competitor_videos_batch({ brand_name: "AG1" })
  8. analyze_competitor_videos_batch({ brand_name: "Huel" })
  9. analyze_competitor_videos_batch({ brand_name: "Bloom Nutrition" })
  10. generate_hooks_matrix({
        competitor_brands: ["AG1", "Huel", "Bloom Nutrition"],
        your_brand: { name: "Sunday Natural", product_description: "...", target_audience: "health-conscious professionals" },
        hook_count: 45
      })

Result: Full hooks matrix + 5 creative briefs + competitive insights
        All without Chrome Extension, manual downloads, or UI interaction.
```

## 24F. Credit Costs

| Operation | Credits |
|-----------|---------|
| Video analysis (Gemini Quick) | 2 per video |
| Video analysis (Gemini Detailed) | 5 per video |
| Video analysis (GPT-4o Quick) | 5 per video |
| Video analysis (GPT-4o Detailed) | 10 per video |
| Hooks matrix generation | 10 per run |

Update the credits page pricing table to include these.

## 24G. PostHog Events

- `video_analysis_started` with `{ brand, provider, depth, video_count }`
- `video_analysis_completed` with `{ brand, provider, videos_analyzed, total_duration_ms, credits_used }`
- `video_analysis_failed` with `{ brand, video_id, error }`
- `hooks_matrix_generated` with `{ competitor_count, videos_analyzed, hooks_generated, credits_used }`
- `hooks_matrix_exported` with `{ format: 'csv' | 'json' | 'md' | 'studio' | 'slack' }`
- `hooks_matrix_sent_to_studio` with `{ hooks_count }`

---

## VERIFY:
- [ ] Gemini Flash analyzes a video and returns structured VideoAnalysisResult
- [ ] GPT-4o Vision analyzes via frame extraction and returns same structure
- [ ] Hook type classification is accurate across different video ad styles
- [ ] Scroll-stop score provides reasonable 1-10 ratings
- [ ] Narrative structure detection works (problem_solution, testimonial, demonstration, etc.)
- [ ] Scene-by-scene breakdown has reasonable timestamps
- [ ] Text overlay extraction captures on-screen text accurately
- [ ] Batch analysis processes all videos for a brand with progress reporting
- [ ] Hooks matrix generation produces hooks matching the Cowork CSV columns (competitor, hook_type, hook_text, rationale, target_emotion, suggested_format)
- [ ] Hooks are written in YOUR brand voice (not the competitor's)
- [ ] Brand guidelines are injected when brand_guidelines_id provided
- [ ] Creative briefs are actionable and reference competitor inspiration
- [ ] Competitive insights identify patterns and gaps across competitors
- [ ] Video analysis page UI shows real-time progress cards
- [ ] Results table is sortable and filterable by competitor, hook_type, format
- [ ] Export works: CSV matches Cowork format, JSON complete, MD readable
- [ ] "Open in Creative Studio" pre-populates with generated hooks
- [ ] "Send to Slack" delivers formatted results to channel
- [ ] MCP tools work end-to-end: search → download → analyze → generate hooks (single conversation)
- [ ] Credits deducted correctly for each operation tier
- [ ] Cached video analyses return instantly
- [ ] Failed video analyses don't crash the batch (graceful handling)
- [ ] PostHog events fire for all operations
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 24 ✅
Commit: `feat: video ad analysis pipeline with Gemini/GPT-4o, hooks matrix generation, and MCP tools`
