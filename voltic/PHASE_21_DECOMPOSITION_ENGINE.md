# PHASE 21: VISION-BASED AD DECOMPOSITION ENGINE

> **Prerequisites:** Phases 1-20 complete. Read CLAUDE.md and PROGRESS.md before starting.

**Goal:** Build the AI backend that takes any ad image (with baked-in text) and separates it into: extracted text layers, clean product/background image, and structured metadata — making every saved ad instantly usable as a Creative Builder input.

**Estimated effort:** 4 hours

---

## 21A. New Dependencies

```bash
npm install sharp
```

OpenAI GPT-4o Vision already available via existing OpenAI client. No new API keys needed.

## 21B. Decomposition Service — `lib/ai/decompose.ts`

Core function: `decomposeAdImage(imageUrl: string, options?: DecomposeOptions)`

**Step 1 — Vision Analysis (GPT-4o Vision):**

Send ad image to GPT-4o with structured prompt returning JSON:

```typescript
interface DecompositionResult {
  texts: {
    content: string               // The extracted text exactly as written
    type: 'headline' | 'subheadline' | 'body' | 'cta' | 'legal' | 'brand'
    position: 'top' | 'center' | 'bottom' | 'overlay'
    estimated_font_size: 'large' | 'medium' | 'small'
    confidence: number            // 0-1
  }[]
  product: {
    detected: boolean
    description: string           // "White bottle of vitamins with green cap"
    position: 'left' | 'center' | 'right' | 'full'
    occupies_percent: number      // Estimated % of image area
  }
  background: {
    type: 'solid_color' | 'gradient' | 'photo' | 'pattern' | 'transparent'
    dominant_colors: string[]     // Hex values
    description: string           // "Soft beige gradient"
  }
  layout: {
    style: 'product_hero' | 'lifestyle' | 'text_heavy' | 'minimal' | 'split' | 'collage'
    text_overlay_on_image: boolean
    brand_elements: string[]      // "Logo top-left", "Tagline bottom"
  }
}
```

System prompt for GPT-4o Vision:
```
You are an expert ad creative analyst. Analyze this advertisement image and extract structured data about its composition. Return ONLY valid JSON matching the specified schema. Be precise about text extraction — capture every piece of visible text exactly as written. For product detection, describe what you see without assuming brand names.
```

**Step 2 — Clean Image Generation (optional, AI-enhanced mode):**

If user wants a "clean" version of the product image without text overlay:
- Option A (fast, cheaper): Use GPT-4o Vision to identify text regions → use Sharp to crop/mask those regions → return product-focused crop
- Option B (higher quality): Send to DALL-E with inpainting prompt: "Remove all text overlays from this product advertisement, keep only the product and background"

**Step 3 — Store Results:**

Save decomposition results to `ad_decompositions` table for caching (don't re-analyze the same image twice).

## 21C. Database — `ad_decompositions` table

Add to `src/db/schema.ts`:

```
ad_decompositions:
- id: uuid (pk)
- workspace_id: uuid (fk)
- source_image_url: text (not null)
- source_type: text ('saved_ad' | 'discover' | 'upload')
- source_id: uuid (nullable, fk to saved_ads.id if applicable)
- extracted_texts: jsonb (array of text objects from Step 1)
- product_analysis: jsonb (product object from Step 1)
- background_analysis: jsonb (background object from Step 1)
- layout_analysis: jsonb (layout object from Step 1)
- clean_image_url: text (nullable, URL of text-removed version in Supabase Storage)
- processing_status: text ('pending' | 'analyzing' | 'completed' | 'failed')
- credits_used: integer (default 5)
- error_message: text (nullable)
- created_at: timestamptz
- updated_at: timestamptz
```

Generate Drizzle migration.

## 21D. API Routes

**POST /api/decompose:**
- Accepts: `{ image_url: string, source_type: string, source_id?: string, generate_clean_image?: boolean }`
- Validates image URL is accessible
- Checks workspace credit balance (5 credits for analysis, +5 for clean image generation)
- Creates ad_decompositions record with status='pending'
- Runs decomposition (sync or async)
- Returns: decomposition_id for polling

**GET /api/decompose/[id]:**
- Returns decomposition result with status
- If status='completed': full DecompositionResult + clean_image_url
- If status='analyzing': progress indicator
- If status='failed': error message

**POST /api/decompose/batch:**
- Accepts: `{ image_urls: string[], source_type: string, generate_clean_images?: boolean }`
- For decomposing all ads in a board at once
- Returns array of decomposition_ids
- Max 20 images per batch

## 21E. Credit Integration

- Ad analysis: 5 credits per image
- Clean image generation: +5 credits (optional add-on)
- Batch: N × credit_cost_per_image
- Record in credit_transactions with type='decomposition'
- Check balance before starting, block if insufficient

## 21F. PostHog Events

- `ad_decomposition_started` with `{ source_type, source_id, generate_clean_image }`
- `ad_decomposition_completed` with `{ decomposition_id, texts_found, product_detected, duration_ms, credits_used }`
- `ad_decomposition_failed` with `{ decomposition_id, error }`
- `ad_decomposition_batch_started` with `{ count, total_credits }`

---

## VERIFY:
- [ ] `decomposeAdImage()` sends image to GPT-4o Vision and receives structured JSON
- [ ] All text in the ad image is extracted with correct type classification
- [ ] Product detection works (detected=true/false, description, position)
- [ ] Background analysis returns dominant colors and type
- [ ] Layout classification is reasonable for different ad styles
- [ ] Results cached in ad_decompositions table (same URL returns cached result)
- [ ] Clean image generation removes text overlays (when enabled)
- [ ] Credits deducted correctly (5 for analysis, +5 for clean image)
- [ ] Insufficient credits blocks the operation
- [ ] Batch endpoint processes multiple images
- [ ] API routes return correct responses for all statuses
- [ ] PostHog events fire
- [ ] `npx tsc --noEmit` passes

Update PROGRESS.md → Phase 21 ✅
Commit: `feat: vision-based ad decomposition engine with GPT-4o Vision and caching`
