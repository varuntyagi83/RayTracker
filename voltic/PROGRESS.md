# Voltic — Development Progress

> Last updated: 2026-02-19

---

## Current State Summary

The Variations feature has been significantly extended to support **two flows**:
1. **Competitor-based** (original) — generate ad variations inspired by saved competitor ads
2. **Asset-based** (new) — generate text variations using your own uploaded brand assets/backgrounds

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
- For **asset-based** variations: AI generates **text only** (headline + body). The image is the **existing uploaded asset** — NO DALL-E generation. The whole point of uploading assets is to reuse them.
- For **competitor-based** variations: AI generates both text AND a new image via DALL-E (since no user image exists).
- The `image_only` strategy for assets shows the asset image with no text.
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

1. **DALL-E text in images** — Despite strong no-text prompts, DALL-E 3 occasionally generates text/logos. This is a known DALL-E limitation. Consider switching to gpt-image-1 or Stable Diffusion for better prompt adherence.
2. **Text overlay on asset images** — Currently, asset-based variations show the raw asset image + AI-generated text as separate fields. A future enhancement could composite the text directly onto the image (like Ad Generator's canvas rendering).
3. **Creative Direction options** — The angle/lighting/background dropdowns currently only influence text generation prompts for asset-based flow (since we don't generate new images). Could add AI image editing (perspective/lighting transforms) in the future.
4. **Multi-asset variations** — Currently one asset per variation. Could support mixing multiple assets (e.g., product on background A, then on background B).
5. **Variation preview** — Could show a richer preview combining image + text overlay before generation.

---

## Test Status

- `src/lib/ai/variations.test.ts` — **52 tests passing** (all prompt builders including asset-based)
- TypeScript: **No errors** (`npx tsc --noEmit` clean)
- Playwright E2E: 21 tests for Variations page (from earlier session)
