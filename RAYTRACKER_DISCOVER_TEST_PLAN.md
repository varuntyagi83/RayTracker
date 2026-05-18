# TEST PLAN: Discover Page Search with page_id Resolution

Run these tests after the Discover page_id feature is implemented. Log results for each.

## Page Search API

- [ ] Search "Nike" returns multiple pages (Nike, Nike Running, Nike Football etc.)
- [ ] Search a misspelled brand like "Nikee" returns relevant results or gracefully returns empty
- [ ] Search a very small/obscure brand and confirm it handles few or zero results without crashing
- [ ] Search with special characters or emoji does not crash the API call or the UI
- [ ] Missing or invalid `SCRAPECREATORS_API_KEY` returns a graceful error, not an unhandled exception

## Autocomplete UX

- [ ] Typing only 1 character does NOT fire the API (minimum 2 chars enforced)
- [ ] Typing fast triggers only 1 debounced API call, not multiple
- [ ] Select a page, then clear it, then type a new brand. Confirm component state resets fully (no stale page_id)
- [ ] Selected page shows correct name and thumbnail in the chip/tag

## URL Construction (Critical)

- [ ] Select a page and click Search. Log the URL being sent to Apify. It MUST contain `view_all_page_id=XXXXX&search_type=page_id` and MUST NOT contain `q=Nike&search_type=keyword_unordered`
- [ ] Toggle Active Only off and confirm `active_status=all` in the constructed URL
- [ ] Change country filter to "US" and confirm `country=US` in the URL
- [ ] Change format filter to "Video" and confirm `media_type=video` in the URL
- [ ] Change "10 ads" to "25 ads" and confirm `count: 25` in the Apify JSON body (not in the URL)

## Fallback

- [ ] Set an invalid API key temporarily. Confirm UI falls back to keyword search with a visible warning message
- [ ] Simulate a network timeout on the page search call. Confirm graceful fallback, no infinite loading state

## End to End

- [ ] Search "Adidas", pick the main Adidas page, hit Search. Confirm the returned ads are actually from Adidas (not random pages mentioning Adidas)
- [ ] Compare results side by side with the old keyword search mode to confirm the improvement is real
- [ ] Save an ad from the new page_id results to a Board. Confirm Board save still works correctly
