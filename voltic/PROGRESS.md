# Voltic — Development Progress

> Last updated: 2026-02-19 (Session 2)

---

## Current State Summary

The Variations feature has been significantly extended to support **two flows**:
1. **Competitor-based** (original) — generate ad variations inspired by saved competitor ads (DALL-E 3 for images)
2. **Asset-based** (new) — edit/transform existing asset images using **Gemini Nano Banana Pro** + generate text via GPT-4o

The Ad Decomposition and Creative Builder features received bug fixes. The codebase is deployed on Vercel at `ray-tracker.vercel.app`.

---

## Recent Changes (Session: Feb 19, 2026)

### 1. Asset-Based Variation Generation (Major Feature)

**Problem:** Variations could only be generated from competitor ads (`savedAdId` required). Users wanted to generate variations directly from their own brand assets.

**What was built:**

| Layer | File | Change |
|-------|------|--------|
| Migration | `supabase/migrations/007_variations_asset_source.sql` | `saved_ad_id` nullable, add `source` + `creative_options` columns |
| Types | `src/types/variations.ts` | `VariationSource`, `CreativeOptions`, angle/lighting/background types + label maps |
| AI Prompts | `src/lib/ai/variations.ts` | `buildAssetTextPrompt`, `buildAssetImagePrompt`, `buildCreativeOptionsSection` |
| Data | `src/lib/data/variations.ts` | `createVariation` accepts optional savedAdId + source/creativeOptions; LEFT JOIN for history |
| Action | `src/app/(dashboard)/boards/actions.ts` | Zod schema updated; branch logic for competitor vs asset flow |
| UI | `src/app/(dashboard)/variations/components/variations-page-client.tsx` | Source toggle, 5-step asset wizard, brand guideline selector |
| Tests | `src/lib/ai/variations.test.ts` | 52 tests covering all prompt builders |

**Architecture decision (IMPORTANT):**
- For **asset-based** variations: **Gemini Nano Banana Pro** (`gemini-3-pro-image-preview`) edits/transforms the existing asset image based on creative direction (angle, lighting, background). GPT-4o generates the text (headline + body). If Gemini fails, gracefully falls back to the original asset image.
- For **competitor-based** variations: AI generates both text (GPT-4o) AND a new image via DALL-E 3 (since no user image exists).
- The `image_only` strategy for assets edits the asset image with no text generation.
- The `text_only` strategy generates text with no image (both flows).

### 2. Brand Guideline Selector in Variations

**Problem:** User wanted variations scoped to a **specific brand guideline**, not generic workspace-level settings. Also wanted to see the guideline's linked background images.

**What was built:**

- **Server actions** in `variations/actions.ts`:
  - `fetchGuidelinesForVariations()` — lists all brand guidelines (id + name)
  - `fetchGuidelineAssetsForVariation({ guidelineId })` — fetches linked background images
- **UI step** (Step 1 in asset flow): Brand Guideline dropdown (optional), with scrollable background image thumbnails when a guideline is selected
- **Generation action** accepts `brandGuidelineId` (optional UUID). When provided, fetches the specific `BrandGuidelineEntity` and converts its voice/colors/audience/rules to `BrandGuidelines` format for AI prompts. Falls back to workspace-level guidelines if not found.

### 3. Ad Decomposition — Text Classification Fix

**Problem:** GPT-4o Vision was classifying marketing overlay text as "brand" (product packaging) type, so the text removal filter skipped it. Result: "Clean Product Image" still showed text.

**Fix (two-pronged):**
1. **Improved vision prompt** (`src/lib/ai/decompose.ts`): Added heuristic guidance — large/medium text at top/center is almost always marketing overlay, not packaging text.
2. **Safety-net filter** (`src/app/api/decompose/route.ts`): Added heuristic that catches misclassified large top/overlay text and includes it in the removal set regardless of type.

### 4. Creative Builder — Image Preview

**Problem:** Users couldn't click on images to preview them in the Creative Builder modal.

**Fix** (`src/app/(dashboard)/boards/[id]/components/creative-builder-modal.tsx`):
- Added `previewImage` state and click handlers on images/cards
- Added full-screen overlay (fixed inset-0, z-100, black/80 backdrop)
- Close on backdrop click or X button, stopPropagation on image click

### 5. Variation History — Image Preview

**Problem:** Users couldn't click on generated variation images to preview them full-screen.

**Fix** (`variations-page-client.tsx`):
- Added `previewImage` state to main component
- `VariationHistoryCard` accepts `onPreview` callback
- Image area is cursor-pointer, hover:opacity-90 transition
- Same full-screen overlay pattern as Creative Builder

### 6. Bug Fixes

- **"strategyies" typo** — Fixed string concatenation: `"strategy" + "ies"` → proper ternary `"strategies" : "strategy"`
- **SelectItem empty value error** — Radix UI doesn't allow `value=""`. Changed to `value="auto"` sentinel for all 3 creative direction dropdowns; filter logic strips "auto" values before passing to action.
- **DALL-E no-text prompt** — Strengthened image prompts with emphatic no-text instruction at both start and end. Changed `"Product called"` → `"Product featuring"` to reduce DALL-E text rendering. (Note: DALL-E 3 still occasionally adds text — this is a known limitation.)

---

## Recent Changes (Session 2: Feb 19, 2026)

### 7. Nano Banana Pro Integration for Asset-Based Variation Images

**Problem:** Asset-based variations were just reusing the raw uploaded asset image with no AI transformation. Creative direction options (angle, lighting, background) only influenced text prompts, not the image itself.

**Solution:** Integrated **Google's Nano Banana Pro** (Gemini 3 Pro Image model) to edit/transform existing asset images based on the user's creative direction.

| Layer | File | Change |
|-------|------|--------|
| Gemini Module | `src/lib/ai/gemini-image-edit.ts` | **NEW** — `buildGeminiEditPrompt()` + `editAssetImageWithGemini()` |
| AI Variations | `src/lib/ai/variations.ts` | Added `generateAssetVariationImage()` export wrapping Gemini module |
| Server Action | `src/app/(dashboard)/boards/actions.ts` | Asset branch now calls Gemini with graceful fallback to original image |
| Tests | `src/lib/ai/gemini-image-edit.test.ts` | **NEW** — 17 tests for prompt builder |

**How it works:**
1. Downloads existing asset image → base64
2. Builds an editing prompt from creative options (angle, lighting, background, custom instruction) + strategy visual notes + brand palette
3. Sends to Gemini REST API (`gemini-3-pro-image-preview`)
4. Extracts edited image (base64) from response
5. Uploads to Supabase Storage at `{workspaceId}/variations/{variationId}-edited.png`
6. Returns public URL

**Fallback:** If Gemini fails (API key missing, rate limit, geo-restriction, etc.), the variation still completes using the original asset image. The text (GPT-4o) is unaffected.

**No new npm packages** — reuses the existing direct REST API pattern from `decompose.ts` `_inpaintWithGemini()`.

**Env var:** `GOOGLE_GENERATIVE_AI_API_KEY` (already existed in `.env.example`).

---

## Key Data Model Notes

### Brand Guidelines (Multiple per Workspace)

```
brand_guidelines table:
  id, workspace_id, name, slug, brand_name, brand_voice,
  color_palette (jsonb - ColorSwatch[]), typography (jsonb),
  target_audience, dos_and_donts, logo_url, files (jsonb),
  is_default, created_at, updated_at
```

- **NOT** the old workspace-level JSONB `BrandGuidelines` from settings
- Entity type: `BrandGuidelineEntity` (from `src/types/brand-guidelines.ts`)
- Assets link via `brand_guideline_id` FK (nullable) on `assets` table
- CRUD: `src/lib/data/brand-guidelines-entities.ts`
- Listing: `listBrandGuidelines(workspaceId)`, `getBrandGuidelineById(workspaceId, id)`
- Assets filtered: `getAssets(workspaceId, search?, brandGuidelineId?)`

### Variations Table

```
variations table:
  id, workspace_id, asset_id, saved_ad_id (NULLABLE),
  source ('competitor' | 'asset'), strategy, channel,
  creative_options (jsonb), status, credits_used,
  generated_headline, generated_body, generated_image_url,
  created_at, updated_at
```

### Two BrandGuidelines Types (Confusing but Important)

1. `BrandGuidelines` (from `src/types/variations.ts`) — flat object with `brandName?, brandVoice?, colorPalette? (string), targetAudience?, dosAndDonts?`. Used by AI prompt builders.
2. `BrandGuidelineEntity` (from `src/types/brand-guidelines.ts`) — full DB entity with `colorPalette: ColorSwatch[]`, `typography`, `logoUrl`, `files[]`, etc.

When a specific guideline is selected, we convert Entity → flat BrandGuidelines:
```typescript
brandGuidelines = {
  brandName: entity.brandName ?? undefined,
  brandVoice: entity.brandVoice ?? undefined,
  colorPalette: entity.colorPalette.map(c => c.hex).join(", ") || undefined,
  targetAudience: entity.targetAudience ?? undefined,
  dosAndDonts: entity.dosAndDonts ?? undefined,
};
```

---

## Feature Patterns to Follow

### Ad Generator Pattern (for guideline → assets flow)
The Ad Generator already implements: guideline dropdown → load linked background images. Reference files:
- `src/app/(dashboard)/ad-generator/actions.ts` — `fetchGuidelinesForAdGenAction()`, `fetchAssetsForGuidelineAdGenAction()`
- `src/app/(dashboard)/ad-generator/components/guideline-selector.tsx`
- `src/app/(dashboard)/ad-generator/components/background-selector.tsx`

### Server Action Pattern
```typescript
"use server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";

const schema = z.object({ ... });

export async function myAction(input: z.input<typeof schema>): Promise<{ data?: T; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // ... logic
}
```

### AI Image Generation Architecture
```
Asset-based variations:
  1. GPT-4o → headline + body text
  2. Gemini Nano Banana Pro (gemini-3-pro-image-preview) → edit existing asset image
     - Downloads asset image → base64
     - Applies creative direction (angle, lighting, background)
     - Uploads result to Supabase Storage
     - Fallback: original asset.imageUrl if Gemini fails

Competitor-based variations:
  1. GPT-4o → headline + body text
  2. DALL-E 3 → generate new image from scratch

Key files:
  - src/lib/ai/gemini-image-edit.ts — Gemini REST API client + prompt builder
  - src/lib/ai/variations.ts — generateAssetVariationImage() (Gemini) + generateVariationImage() (DALL-E)
  - src/app/(dashboard)/boards/actions.ts — orchestrates the flow
```

### Image Preview Overlay Pattern
Used in Creative Builder and Variations:
```typescript
const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
// ... in JSX:
{previewImage && (
  <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-zoom-out"
    onClick={() => setPreviewImage(null)}>
    <button onClick={() => setPreviewImage(null)}
      className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 ...">
      <X className="size-5" />
    </button>
    <img src={previewImage.url} alt={previewImage.alt}
      className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
      onClick={(e) => e.stopPropagation()} />
  </div>
)}
```

---

## Commit History (Recent)

| Commit | Description |
|--------|-------------|
| `2d7c01b` | fix: asset-based variations use existing uploaded image instead of DALL-E |
| `749d90a` | fix: typo, stronger no-text image prompt, variation preview overlay |
| `ce67af7` | feat: add brand guideline selector to Variations asset flow |
| `cd02f3a` | fix: use 'auto' sentinel value for Select dropdowns instead of empty string |
| `de124fd` | feat: asset-based variations, decomposition text fix, creative builder preview |
| `a34d784` | Fix generate-background API: remove unsupported n param, add output_format |
| `660af35` | fix: remove direct DELETE from storage.buckets in migration SQL |
| `9c4790f` | fix: ad analysis modal scroll overflow |
| `f01d48e` | fix: consolidate storage to single brand-assets bucket |
| `dc65d11` | docs: update progress tracking for Phase 23 and Session 6 |
| `4c3465a` | feat: brand guidelines elements bucket, assets guideline linkage, ad generator |
| `3ef94d5` | feat: standalone Variations page with channel-aware AI generation |

---

## Known Issues / Future Work

1. **DALL-E text in images** — Despite strong no-text prompts, DALL-E 3 occasionally generates text/logos. This is a known DALL-E limitation. Only affects competitor-based flow now.
2. **Text overlay on asset images** — Asset-based variations show the Gemini-edited image + AI-generated text as separate fields. A future enhancement could composite the text directly onto the image (like Ad Generator's canvas rendering).
3. ~~**Creative Direction options**~~ — **RESOLVED:** Nano Banana Pro now applies angle/lighting/background transformations to the actual image for asset-based variations.
4. **Multi-asset variations** — Currently one asset per variation. Could support mixing multiple assets (e.g., product on background A, then on background B).
5. **Variation preview** — Could show a richer preview combining image + text overlay before generation.
6. **Gemini image size limits** — Large asset images (>10MB) could cause issues with the Gemini API. Consider adding image resizing before sending to API if needed.

---

## Test Status

- `src/lib/ai/variations.test.ts` — **52 tests passing** (all prompt builders including asset-based)
- `src/lib/ai/gemini-image-edit.test.ts` — **17 tests passing** (Gemini edit prompt builder)
- TypeScript: **No errors** (`npx tsc --noEmit` clean)
- Playwright E2E: 21 tests for Variations page (from earlier session)
