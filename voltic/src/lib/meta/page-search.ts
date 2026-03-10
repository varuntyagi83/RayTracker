/**
 * ScrapeCreators Facebook Ad Library — Page Search
 *
 * Resolves a brand name to a Facebook page_id so the Discover page can use
 * the reliable `view_all_page_id` URL instead of keyword search.
 *
 * Env vars:
 *   SCRAPECREATORS_API_KEY — API key from https://app.scrapecreators.com
 *
 * API response shape (company/ads endpoint):
 *   { success, results: [{ page_id, page_name, snapshot: { page_profile_picture_url, page_categories } }] }
 */

export interface MetaPage {
  page_id: string;
  name: string;
  category?: string;
  image_uri?: string;
  verification_status?: string;
}

interface ScrapeCreatorsResult {
  page_id: string | number;
  page_name: string;
  snapshot?: {
    page_profile_picture_url?: string;
    page_categories?: string[];
  };
}

interface ScrapeCreatorsResponse {
  success?: boolean;
  results?: ScrapeCreatorsResult[];
}

const BASE_URL = "https://api.scrapecreators.com";

/**
 * Search for Facebook pages matching `query`.
 * Uses ScrapeCreators company/ads endpoint and deduplicates by page_id.
 * Returns up to 8 matching pages, or [] on any error.
 */
export async function searchMetaPages(
  query: string,
  country = "ALL"
): Promise<MetaPage[]> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  try {
    const params = new URLSearchParams({
      companyName: query.trim(),
      country: country || "ALL",
      trim: "true",
    });

    const res = await fetch(
      `${BASE_URL}/v1/facebook/adLibrary/company/ads?${params}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json() as ScrapeCreatorsResponse;
    const results = data.results ?? [];

    // Deduplicate by page_id — multiple ads may come from the same page
    const seen = new Set<string>();
    const pages: MetaPage[] = [];

    for (const item of results) {
      const pageId = String(item.page_id ?? "").trim();
      const name = String(item.page_name ?? "").trim();
      if (!pageId || !name || seen.has(pageId)) continue;

      seen.add(pageId);
      const categories = item.snapshot?.page_categories;
      pages.push({
        page_id: pageId,
        name,
        category: Array.isArray(categories) && categories.length > 0
          ? categories[0]
          : undefined,
        image_uri: item.snapshot?.page_profile_picture_url,
      });

      if (pages.length >= 8) break;
    }

    return pages;
  } catch {
    return [];
  }
}
