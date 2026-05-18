# TASK: Upgrade Discover Search from Keyword to Page ID Resolution

Read CLAUDE.md and PROGRESS.md first. This is a **scoped feature change** to the existing Discover page. Do NOT touch any other features.

## PROBLEM

The Discover search currently constructs an Ad Library URL using keyword search:
```
https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=Nike&search_type=keyword_unordered
```

This is passed to the `curious_coder/facebook-ads-library-scraper` Apify actor. Keyword search is **unreliable** — it returns ads from random pages that mention the keyword, not ads from the actual brand the user searched for. Known issues include returning archived ads, wrong advertisers, and infinite retry loops.

## SOLUTION

Add a **page resolution step** between the search input and the Apify scraper call. The flow changes from:

**BEFORE:** User types brand name → build keyword URL → call Apify → show results

**AFTER:** User types brand name → call Page Search API → show dropdown of matching pages → user picks one → build `view_all_page_id` URL → call Apify → show results

## IMPLEMENTATION

### Step 1: Page Search API Integration

Create `lib/meta/page-search.ts`:

```typescript
interface MetaPage {
  page_id: string;
  name: string;
  category?: string;
  image_uri?: string;
  verification_status?: string;
}

interface PageSearchResult {
  page_results: MetaPage[];
}
```

Use the **ScrapeCreators Facebook Ad Library API** to search for companies by name and get their page_id.

**Company/Page search endpoint:**
```
GET https://api.scrapecreators.com/v1/facebookadlibrary/profile
  ?handle={brand_name}

Headers:
  x-api-key: {SCRAPECREATORS_API_KEY}
```

This returns page metadata including the `page_id`, page name, and other details.

**If the above endpoint doesn't support fuzzy name search**, use their ad search endpoint with `companyName` param as a fallback:
```
GET https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads
  ?companyName={brand_name}
  &country={country_code}
  &trim=true

Headers:
  x-api-key: {SCRAPECREATORS_API_KEY}
```

This returns ads for the matched company, and each ad result includes the `page_id` and `page_name`. Extract the unique page_id from the first result to use in the Apify URL.

Add `SCRAPECREATORS_API_KEY` to your `.env` and environment variables.

**Pricing:** 100 free credits to start (no credit card needed). Paid plans: Solo Dev at $10, Freelance at $47 for 25,000 credits. Credits never expire. No monthly subscription. At the Freelance tier, each page lookup costs ~$0.0019, so 25,000 lookups will last a very long time in private beta.

Sign up at: https://app.scrapecreators.com

**Alternative (completely free, more setup):** Meta's official Ad Library API can search pages too, but requires identity verification (driver's license), a Meta Developer App, and an access token with `ads_read` permissions. The API is free but fragile and complex to set up. Use this only if you want zero external costs long term.

### Step 2: New API Route

Create `app/api/meta/page-search/route.ts`:

```typescript
// POST /api/meta/page-search
// Body: { query: string, country?: string }
// Returns: { pages: MetaPage[] }
```

- Validate that the request comes from an authenticated user in a workspace
- Call the Page Search API with the query
- Return the top 10 matching pages
- Cache results in memory or a short-TTL cache (same brand name searched multiple times)
- Handle errors gracefully (return empty array, don't crash)

### Step 3: Update Discover UI — Search Box with Autocomplete

Modify the Discover page search component:

**Current behavior:** Text input + Search button. On click, constructs keyword URL and calls Apify.

**New behavior:**
1. User types in the search box (minimum 2 characters)
2. After 300ms debounce, call `/api/meta/page-search` with the typed text
3. Show a **dropdown below the search input** with matching pages:
   - Each row shows: page profile image (small thumbnail), page name, category, verification badge (if verified)
   - Maximum 8 results in dropdown
   - Keyboard navigation (arrow keys + enter) supported
   - Click or Enter selects a page
4. When a page is selected:
   - Store the selected `page_id` in component state
   - Show the selected page name + thumbnail as a "chip" or tag in/below the search box (so user knows what they picked)
   - The "Search" button now uses `view_all_page_id` instead of `q=keyword`
5. User can clear the selection to search again
6. If no pages are found, show "No matching pages found. Try a different name."

**Fallback:** If the Page Search API fails or is unavailable, fall back to the current keyword search behavior. Show a subtle warning: "Showing keyword results (less accurate)."

### Step 4: Update URL Construction

In the function that builds the Apify actor input JSON, change the URL construction:

**BEFORE:**
```typescript
const url = `https://www.facebook.com/ads/library/?active_status=${activeStatus}&ad_type=all&country=${country}&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;
```

**AFTER (when page_id is available):**
```typescript
const url = `https://www.facebook.com/ads/library/?active_status=${activeStatus}&ad_type=all&country=${country}&view_all_page_id=${pageId}&search_type=page_id`;
```

The Apify actor input JSON becomes:
```json
{
  "urls": [
    {
      "url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=123456&search_type=page_id"
    }
  ],
  "count": 10,
  "scrapePageAds.period": "",
  "scrapePageAds.activeStatus": "active",
  "scrapePageAds.sortBy": "impressions_desc",
  "scrapePageAds.countryCode": "ALL"
}
```

All existing filters from the Discover UI still apply:
- **Active only toggle** → `active_status` param in URL
- **All Formats** → `media_type` param in URL (all/image/video/meme)
- **All Countries** → `country` param in URL
- **Number of ads** → `count` field in Apify JSON (not a URL param)
- **Newest First / sort** → `scrapePageAds.sortBy` in Apify JSON (handled post-scrape or by actor)

### Step 5: Update Competitor Automation (Optional but Recommended)

The Competitor Automation wizard (Phase 6) currently asks users to manually paste a Meta Ads Library URL. Consider adding the same page search autocomplete to this wizard's "Competitor Brand Name" field, so when they type a brand name it auto-resolves to the correct page_id and constructs the URL for them. This is a UX improvement but not mandatory for this task.

## FILES TO CREATE/MODIFY

**New files:**
- `lib/meta/page-search.ts` — Page Search API client
- `app/api/meta/page-search/route.ts` — API route
- `components/discover/PageSearchInput.tsx` — New autocomplete search component

**Modified files:**
- Discover page component (wherever the search box currently lives) — replace text input with PageSearchInput
- The function/service that constructs the Apify actor URL — add page_id URL mode
- `.env` / `.env.example` — add `SCRAPECREATORS_API_KEY`

## VERIFY

- [ ] Typing a brand name shows dropdown with matching Facebook pages (with thumbnails, names, categories)
- [ ] Selecting a page stores the page_id and shows the selection as a chip/tag
- [ ] Clicking Search constructs URL with `view_all_page_id` instead of `q=keyword`
- [ ] All existing filters (Active, Format, Country, Count) still work correctly
- [ ] Fallback to keyword search works when Page Search API is unavailable
- [ ] Empty/no results state handled gracefully
- [ ] `npx tsc --noEmit` passes
- [ ] No regressions in other Discover functionality (Boards save, ad cards, etc.)

Commit: `feat: discover page search with page_id resolution for reliable ad results`
