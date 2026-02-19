# Voltic — Debug Progress Log

> Tracks bugs found, root causes, and fixes applied during development sessions.

---

## Session 3: Feb 19, 2026

### Bug 1: Generate Variations Button Not Clickable

**Symptom:** In asset flow, the "Generate Variations" button was greyed out/disabled even though strategies, channel, and brand guideline were all selected.

**Root cause:** `handleGuidelineSelect()` in `variations-page-client.tsx` called `setSelectedAssetId("")` every time a guideline was changed. This cleared the product selection from Step 2, and the `canGenerate` condition requires `selectedAssetId` to be truthy for asset flow.

```typescript
// canGenerate condition (line 308-311):
const canGenerate =
  variationSource === "competitor"
    ? selectedAd && selectedAssetId && selectedStrategies.size > 0 && !generating
    : selectedAssetId && selectedStrategies.size > 0 && !generating;
```

**Fix:** Removed `setSelectedAssetId("")` from `handleGuidelineSelect()`. Guideline selection (Step 1) and product selection (Step 2) are independent — changing one should not clear the other. The `handleSourceChange()` function still correctly resets everything when toggling between competitor/asset flows.

**File:** `src/app/(dashboard)/variations/components/variations-page-client.tsx`
**Commit:** `10803a0`

---

### Bug 2: Asset Upload "Unexpected Response From Server"

**Symptom:** Clicking "Create & Select" to upload a new product image showed "An unexpected response was received from the server" error toast.

**Root cause:** Next.js server actions have a default **1MB body size limit**. The `createAssetAction()` receives a `FormData` with the image file. Any image over ~1MB (but under the client-side 5MB validation) would hit this limit. The existing `proxyClientMaxBodySize: "50mb"` in `next.config.ts` only applies to the Next.js proxy, NOT to server actions.

**Fix:** Added `serverActions.bodySizeLimit: "5mb"` to the `experimental` block in `next.config.ts`:

```typescript
experimental: {
  proxyClientMaxBodySize: "50mb",
  serverActions: {
    bodySizeLimit: "5mb",
  },
},
```

**File:** `next.config.ts`
**Commit:** `10803a0`

---

### Bug 3: Gemini Image Editing Not Working (Silent Fallback)

**Symptom:** Asset-based variations appeared as "Completed" but the generated images were identical to the original asset photo — no AI transformation was applied. Creative direction options (angle, lighting, background) had no visible effect on the image.

**Root cause (two issues):**

1. **Wrong Gemini model name:** `gemini-image-edit.ts` used `gemini-3-pro-image-preview` as the model ID. This model doesn't exist in the Google Generative AI API, causing a **404 error** on every call. The working `decompose.ts` uses `gemini-2.5-flash-image`.

2. **Silent fallback:** The error was caught by a try/catch in `boards/actions.ts` that silently fell back to `asset.imageUrl` (the original image). The variation was marked as "Completed" with the original unedited image, giving no indication that Gemini had failed.

```typescript
// BEFORE (silent fallback — bad):
try {
  imageUrl = await generateAssetVariationImage(...);
} catch (editErr) {
  console.error("[variations] Gemini image editing failed, falling back:", editErr);
  imageUrl = asset.imageUrl;  // User sees original image, thinks it worked
}

// AFTER (failures surface properly):
imageUrl = await generateAssetVariationImage(...);
// If this throws, outer catch handles it: failVariation() + refundCredits()
```

**Fix:**
1. Changed `GEMINI_MODEL` from `"gemini-3-pro-image-preview"` to `"gemini-2.5-flash-image"`
2. Removed the silent try/catch fallback — Gemini failures now propagate to the outer error handler which marks the variation as "failed" and refunds credits

**Key lesson:** The Gemini model name must match what's used in `decompose.ts` (`gemini-2.5-flash-image`). The model `gemini-3-pro-image-preview` was a speculative name from early research and doesn't exist.

**Files:** `src/lib/ai/gemini-image-edit.ts`, `src/app/(dashboard)/boards/actions.ts`
**Commit:** `d86bb4f`

---

### Bug 4: Gemini Re-rendering Product Label Text With Spelling Errors

**Symptom:** Generated variation images had the product label/packaging text altered with incorrect spelling. The product was being visually modified even though the prompt said "preserve the product."

**Root cause:** Gemini's image editing model doesn't respect text-only prompt guardrails reliably. When asked to "edit this image" with instructions like "don't modify the product text," the model still re-renders the entire image including the product area, introducing spelling errors in label text.

**Fix (two-phase):**

**Phase 1 — Stronger prompt (commit `f334c05`):**
```
- Preserve the product EXACTLY as it appears
- Do NOT modify, re-render, or regenerate any text on the product label
- The product label, brand name, and any printed text must remain with correct spelling
```
This helped but wasn't sufficient — AI models don't reliably preserve text pixels from prompts alone.

**Phase 2 — Product mask protection (commit `da292b3`):**

Implemented a two-step Gemini pipeline (same pattern as `decompose.ts` `_inpaintWithGemini`):

1. **Mask generation:** Send image to Gemini → get binary segmentation mask (white = product, black = background)
2. **Protected editing:** Send original + mask to Gemini → "only modify BLACK areas, preserve WHITE areas exactly"

```typescript
// Step 1: Generate mask
const maskBuffer = await _generateProductMask(imageBuffer, apiKey);

// Step 2: Edit with mask (4-part payload, same as decompose.ts)
parts: [
  { text: prompt },
  { inlineData: { mimeType: "image/png", data: imageBuffer } },  // original
  { text: "Product mask (WHITE = preserve, BLACK = modify):" },
  { inlineData: { mimeType: "image/png", data: maskBuffer } },   // mask
]
```

**Key lesson:** For AI image editing, prompt-only guardrails are unreliable for pixel-level preservation. Mask-based approaches (providing explicit regions to protect/modify) are much more dependable. This is the same lesson learned in the decompose feature.

**Trade-off:** Adds ~15 seconds per variation (extra Gemini call for mask). Total per strategy: ~35s (was ~20s).

**Files:** `src/lib/ai/gemini-image-edit.ts`, `src/lib/ai/gemini-image-edit.test.ts`
**Commits:** `f334c05` (prompt), `da292b3` (mask protection)

---

## Debugging Patterns & Notes

### How to check if Gemini is actually working
- If variation images look identical to the original asset → Gemini is likely failing
- Check Vercel function logs for `[variations]` prefixed errors
- The variation status should be "failed" (not "completed") if Gemini fails

### Next.js body size limits
- Server actions: default 1MB, configured via `experimental.serverActions.bodySizeLimit`
- Proxy: configured via `experimental.proxyClientMaxBodySize`
- API routes: no default limit (but Vercel has function payload limits)
- These are SEPARATE settings — configuring one does not affect the other

### Vercel function timeouts
Current `maxDuration` exports in the codebase:
- `/api/assets/generate-background/route.ts` — 120s
- `/api/studio/generate-image/route.ts` — 180s
- `/api/ads/composite/route.ts` — 60s
- `/api/ads/composite-batch/route.ts` — 300s
- `/api/studio/chat/route.ts` — 60s
- `/api/decompose/route.ts` — **MISSING** (should add)
- Server actions (e.g. `generateVariationsAction`) — uses Vercel default (60s Pro)

### Gemini model reference
- **Working model:** `gemini-2.5-flash-image` (used by decompose.ts and gemini-image-edit.ts)
- **Invalid model:** `gemini-3-pro-image-preview` (does not exist, returns 404)
- **API pattern:** Direct REST API via `fetch()`, no SDK. API key passed as URL query param.
- **Env var:** `GOOGLE_GENERATIVE_AI_API_KEY`

### Gemini two-image mask pattern
Used in both `decompose.ts` and `gemini-image-edit.ts`:
```typescript
parts: [
  { text: prompt },
  { inlineData: { mimeType: "image/png", data: originalBase64 } },
  { text: "Description of second image (mask):" },
  { inlineData: { mimeType: "image/png", data: maskBase64 } },
]
```
- Mask generation uses `responseModalities: ["IMAGE"]` (image-only response)
- Editing uses `responseModalities: ["TEXT", "IMAGE"]` (allows text + image)
- This pattern is the most reliable way to control which regions Gemini modifies
