/**
 * ScrapeCreators Facebook Ad Library — Page Search
 *
 * Resolves a brand name to a Facebook page_id so the Discover page can use
 * the reliable `view_all_page_id` URL instead of keyword search.
 *
 * Env vars:
 *   SCRAPECREATORS_API_KEY — API key from https://app.scrapecreators.com
 */

export interface MetaPage {
  page_id: string;
  name: string;
  category?: string;
  image_uri?: string;
  verification_status?: string;
}

const BASE_URL = "https://api.scrapecreators.com";

/**
 * Search for Facebook pages matching `query`.
 * Tries the profile endpoint first; falls back to the company/ads endpoint.
 * Returns up to 8 matching pages, or [] on any error.
 */
export async function searchMetaPages(
  query: string,
  country = "ALL"
): Promise<MetaPage[]> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  // ── 1. Profile endpoint ──────────────────────────────────────────────────
  try {
    const res = await fetch(
      `${BASE_URL}/v1/facebookadlibrary/profile?handle=${encodeURIComponent(query.trim())}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (res.ok) {
      const data = await res.json() as unknown;

      // Handle array response
      if (Array.isArray(data) && data.length > 0) {
        const pages = data
          .filter((p) => p && typeof p === "object" && ("page_id" in p || "id" in p))
          .map((p: Record<string, unknown>) => normalizeProfilePage(p))
          .filter((p): p is MetaPage => !!p.page_id && !!p.name);
        if (pages.length > 0) return pages.slice(0, 8);
      }

      // Handle single object response
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const page = normalizeProfilePage(data as Record<string, unknown>);
        if (page.page_id && page.name) return [page];
      }
    }
  } catch {
    // fall through to fallback
  }

  // ── 2. Company/Ads fallback — extract unique page from ad results ─────────
  try {
    const params = new URLSearchParams({
      companyName: query.trim(),
      country: country === "ALL" ? "US" : country,
      trim: "true",
    });

    const res = await fetch(
      `${BASE_URL}/v1/facebook/adLibrary/company/ads?${params}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (res.ok) {
      const data = await res.json() as unknown;
      const ads: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.ads)
          ? (data as Record<string, unknown[]>).ads as Record<string, unknown>[]
          : [];

      const seen = new Set<string>();
      const pages: MetaPage[] = [];

      for (const ad of ads) {
        const pageId = String(ad.page_id ?? ad.pageId ?? "").trim();
        const name = String(ad.page_name ?? ad.pageName ?? "").trim();
        if (pageId && name && !seen.has(pageId)) {
          seen.add(pageId);
          pages.push({
            page_id: pageId,
            name,
            category: ad.page_category as string | undefined,
            image_uri: (ad.page_profile_picture_url ?? ad.profile_picture_url) as string | undefined,
          });
        }
        if (pages.length >= 8) break;
      }

      return pages;
    }
  } catch {
    // both endpoints failed
  }

  return [];
}

function normalizeProfilePage(p: Record<string, unknown>): MetaPage {
  return {
    page_id: String(p.page_id ?? p.id ?? ""),
    name: String(p.name ?? p.page_name ?? ""),
    category: p.category as string | undefined ?? p.page_category as string | undefined,
    image_uri: (p.profile_picture_url ?? p.image_uri ?? p.picture) as string | undefined,
    verification_status: p.verification_status as string | undefined ?? p.verified as string | undefined,
  };
}
