# PHASE 22: DECOMPOSER UI & CREATIVE BUILDER INTEGRATION

> **Prerequisites:** Phase 21 complete. Read CLAUDE.md and PROGRESS.md before starting.

**Goal:** Build the UI for ad decomposition and wire it into the existing Creative Builder pipeline so users can go from any competitor ad → decomposed assets → new creative combinations in one flow.

**Estimated effort:** 4 hours

---

## 22A. Decompose Button — Injected on Saved Ad Cards

Add a "🔬 Decompose" button on every saved ad card in:
- Board detail page (`/boards/[id]`) — next to existing "✨ Variations" button
- Discover page (`/discover`) — next to "Add to board" button

Button states:
- Default: "🔬 Decompose" (outline style)
- Loading: spinner + "Analyzing..."
- Done: "✅ Decomposed" (green, clickable to view results)
- Already cached: "✅ Decomposed" shown immediately (check ad_decompositions table on render)

## 22B. Decomposition Results Modal — `components/shared/decomposition-modal.tsx`

Opens when clicking "Decompose" or "✅ Decomposed". Full-width modal with three panels:

### Left Panel — Original Ad
- Full ad image at the top
- Source info: brand name, format, platform, saved date
- "Re-analyze" button (re-runs decomposition, costs credits again)

### Center Panel — Extracted Components

**Text Layers section:**
- Each extracted text shown as an editable card:
  - Type badge (HEADLINE / SUBHEADLINE / BODY / CTA / LEGAL / BRAND)
  - Text content (editable textarea — user can correct OCR mistakes)
  - Position + font size metadata (muted text)
  - Confidence indicator (green >0.9, yellow >0.7, red <0.7)
  - Checkbox to include/exclude from Creative Builder export
- "➕ Add text" button — manually add text the AI missed

**Product section:**
- Product description from AI
- Product position indicator
- Thumbnail crop of detected product region (if possible)

**Background section:**
- Dominant colors as swatches
- Background type badge
- Description

### Right Panel — Clean Image
- If clean image was generated: show it with download button
- If not generated yet: "✨ Generate clean image (+5 credits)" button
- Below: comparison slider (original ↔ clean) so user can see what was removed

### Bottom Action Bar
- "📋 Copy texts to clipboard" — copies all extracted texts
- "➡️ Send to Creative Builder" — primary green button (the key integration)
- "💾 Save as Asset" — saves the clean image as a new product in Assets
- Credit cost indicator: "5 credits used" or "10 credits used (with clean image)"

## 22C. "Send to Creative Builder" Integration

This is the key workflow connection. When user clicks "Send to Creative Builder":

1. Open the existing Creative Builder modal (from Phase 14)
2. **Auto-populate** it with decomposed data:
   - **Images tab:** pre-loaded with the clean image (if generated) OR the original image. If user has products in Assets, show those too as additional image options
   - **Texts tab:** pre-loaded with all extracted texts that were checked (included):
     - Type 'headline' → headline field
     - Type 'body' → body field
     - Type 'cta' → appended to body
     - Type 'subheadline' → alternate headline
   - The N×M combination grid immediately shows all possible combos
3. User can edit texts, add more images, toggle AI-enhanced mode, and generate

**This means: Discover → Save to Board → Decompose → Send to Creative Builder → Generate 20 ad variants becomes a 5-click flow.**

## 22D. Board-Level Batch Decompose

On the board detail page, add a "🔬 Decompose All" button next to "✨ Create Variations" in the header.

Clicking it:
1. Shows confirmation: "Decompose {N} ads in this board? Cost: {N × 5} credits"
2. On confirm: calls POST /api/decompose/batch
3. Shows progress bar: "Analyzing {completed}/{total}..."
4. As each completes, the card updates to "✅ Decomposed"
5. When all done: toast "All ads decomposed! Click any ad to see results."

## 22E. Decomposition Results in Board Grid

On board detail page, if an ad has been decomposed, show a subtle indicator on the card:
- Small "🔬" icon badge on the thumbnail (like the "+N versions" badge)
- On hover: tooltip "Decomposed — {N} texts extracted, product detected"
- Clicking the badge opens the decomposition modal directly

## 22F. "Save as Asset" Flow

From the decomposition modal, "Save as Asset" button:
1. Takes the clean image (or original if no clean generated)
2. Opens a mini-modal: product name (pre-filled from AI product description), description, image preview
3. On save: creates new asset in Assets table with the image uploaded to Supabase Storage
4. Success toast: "Product saved to Assets! You can now use it in variations."
5. This asset is now available in the Creative Builder product selector AND the Variation modal

## 22G. Updated Credit Costs Display

Update the credit system UI to show new decomposition costs:
- In workspace settings / credit page: add "Ad Decomposition — 5 credits" and "Clean Image Generation — 5 credits" to the pricing table
- In decomposition modal: always show current balance and cost before action
- In batch decompose confirmation: show total cost and remaining balance

## 22H. PostHog Events

- `decompose_button_clicked` with `{ source: 'board'|'discover', ad_id }`
- `decomposition_modal_opened` with `{ decomposition_id, cached: boolean }`
- `decomposition_text_edited` with `{ decomposition_id, text_type }`
- `decomposition_text_added` with `{ decomposition_id }`
- `decomposition_sent_to_builder` with `{ decomposition_id, text_count, has_clean_image }`
- `decomposition_saved_as_asset` with `{ decomposition_id, asset_id }`
- `decomposition_clean_image_generated` with `{ decomposition_id }`
- `decomposition_batch_started` with `{ board_id, ad_count, total_credits }`
- `decomposition_batch_completed` with `{ board_id, success_count, failed_count, duration_ms }`

---

## VERIFY:
- [ ] "🔬 Decompose" button appears on saved ad cards in boards and discover
- [ ] Button shows correct state (default → loading → done → cached)
- [ ] Decomposition modal opens with three panels (original, extracted, clean)
- [ ] Extracted texts are editable with correct type badges
- [ ] Confidence indicators show correct colors
- [ ] User can add/remove text entries manually
- [ ] Clean image generation works from modal (+5 credits)
- [ ] Comparison slider works (original ↔ clean)
- [ ] "Send to Creative Builder" opens Creative Builder pre-populated with decomposed data
- [ ] Texts correctly mapped to headline/body fields
- [ ] Clean image loaded into images tab
- [ ] N×M grid immediately shows combinations
- [ ] "Save as Asset" creates product in Assets with image
- [ ] Board-level "Decompose All" batch works with progress bar
- [ ] "🔬" badge appears on decomposed ad cards in board grid
- [ ] Credits deducted correctly for all operations
- [ ] Cached results return instantly without re-analysis
- [ ] PostHog events fire for all interactions
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 22 ✅
Commit: `feat: ad decomposer UI with Creative Builder integration and batch processing`
