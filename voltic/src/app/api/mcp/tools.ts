/**
 * MCP Tool Definitions & Dispatcher
 *
 * TOOL_LIST   — array of tool metadata objects (name, description, inputSchema)
 * handleMcpMethod — routes an incoming JSON-RPC method name + params to the
 *                   correct lib/data or lib/ai function and returns the result.
 */

import { searchAdsLibrary } from "@/lib/data/discover";
import { saveAdToBoard } from "@/lib/data/discover";
import { getBoards, createBoard } from "@/lib/data/boards";
import { listCompetitorBrands } from "@/lib/data/competitors";
import { getWorkspaceKPIs } from "@/lib/data/dashboard";
import { generateVariationText } from "@/lib/ai/variations";
import { generateAdInsights } from "@/lib/ai/insights";
import { generateAdComparison } from "@/lib/ai/comparison";
import { generateCompetitorReport } from "@/lib/ai/competitor-report";
import { decomposeAdImage } from "@/lib/ai/decompose";
import { downloadAndStoreMedia } from "@/lib/media/download";
import type { DiscoverAd } from "@/types/discover";
import type { CompetitorAd } from "@/types/competitors";

// ─── Tool Metadata ────────────────────────────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_LIST: McpToolDefinition[] = [
  {
    name: "search_ads",
    description:
      "Search the Meta Ads Library for ads by brand name. Returns ad creative data including headlines, body copy, media URLs, and performance signals.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Brand name or keyword to search for",
        },
        limit: {
          type: "number",
          description: "Maximum number of ads to return (default: 20, max: 100)",
        },
        active_only: {
          type: "boolean",
          description: "If true, only return currently active ads",
        },
        country: {
          type: "string",
          description: "Country code to filter ads (e.g. 'US', 'GB'). Defaults to 'ALL'.",
        },
        format: {
          type: "string",
          enum: ["image", "video", "carousel", "all"],
          description: "Filter by ad format",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_boards",
    description: "List all swipe-file boards in the workspace, including ad counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_board",
    description: "Create a new swipe-file board in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Board name",
        },
        description: {
          type: "string",
          description: "Optional board description",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "save_to_board",
    description:
      "Save an ad to a swipe-file board. The ad_data object must contain the ad fields returned by search_ads.",
    inputSchema: {
      type: "object",
      properties: {
        board_id: {
          type: "string",
          description: "Target board ID (use list_boards to find it)",
        },
        ad_data: {
          type: "object",
          description: "Ad object as returned by search_ads",
        },
      },
      required: ["board_id", "ad_data"],
    },
  },
  {
    name: "list_competitors",
    description:
      "List all competitor brands tracked in the workspace, including their ad counts and last-scraped timestamps.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_dashboard_kpis",
    description:
      "Get workspace-level KPIs: revenue, spend, and profit for today, yesterday, and the last 7 days across all connected ad accounts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "decompose_ad",
    description:
      "Decompose an ad image with GPT-4o Vision. Extracts all text elements (headlines, body, CTAs, legal, brand), product details, background description, and layout classification.",
    inputSchema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "Public HTTPS URL of the ad image to analyze",
        },
      },
      required: ["image_url"],
    },
  },
  {
    name: "generate_variations",
    description:
      "Generate ad copy variations (headline + body) using GPT-4o. Optionally provide a competitor ad for inspiration. Returns JSON with headline and body fields.",
    inputSchema: {
      type: "object",
      properties: {
        asset_name: {
          type: "string",
          description: "Your product name",
        },
        asset_description: {
          type: "string",
          description: "Your product description",
        },
        strategy: {
          type: "string",
          enum: [
            "hero_product",
            "curiosity",
            "pain_point",
            "proof_point",
            "image_only",
            "text_only",
          ],
          description: "Copywriting strategy to apply",
        },
        channel: {
          type: "string",
          enum: ["facebook", "instagram", "tiktok", "linkedin", "google"],
          description: "Target ad channel (influences tone and style)",
        },
        competitor_ad: {
          type: "object",
          description:
            "Optional competitor ad object for inspiration (brandName, headline, body, format)",
        },
      },
      required: ["asset_name", "strategy"],
    },
  },
  {
    name: "analyze_ad",
    description:
      "Analyze a single ad with AI. Returns hook type, copy structure, creative strategy, target audience, performance score, strengths, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        brand_name: {
          type: "string",
          description: "Brand running the ad",
        },
        headline: {
          type: "string",
          description: "Ad headline text",
        },
        body_text: {
          type: "string",
          description: "Ad body copy",
        },
        format: {
          type: "string",
          description: "Ad format (image, video, carousel)",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Platforms the ad runs on",
        },
        landing_page_url: {
          type: "string",
          description: "Ad landing page URL (optional)",
        },
        runtime_days: {
          type: "number",
          description: "Number of days the ad has been running",
        },
        is_active: {
          type: "boolean",
          description: "Whether the ad is currently active",
        },
      },
      required: ["brand_name", "format", "platforms"],
    },
  },
  {
    name: "compare_ads",
    description:
      "Compare 2–4 ads side-by-side with AI. Returns per-ad scores, a winner with rationale, comparative insights, and actionable recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        ads: {
          type: "array",
          description:
            "Array of 2–4 ad objects to compare. Each must have id, pageName, headline, bodyText, mediaType, platforms, linkUrl, runtimeDays, isActive, mediaThumbnailUrl.",
          items: { type: "object" },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ["ads"],
    },
  },
  {
    name: "generate_competitor_report",
    description:
      "Generate a comprehensive AI competitor intelligence report from a list of competitor ads. Returns per-ad analyses plus a cross-brand summary with patterns, best practices, and gaps.",
    inputSchema: {
      type: "object",
      properties: {
        ads: {
          type: "array",
          description:
            "Array of competitor ad objects (up to 50). Each must have id, competitorBrandId, metaLibraryId, headline, bodyText, format, mediaType, platforms, startDate, runtimeDays, isActive.",
          items: { type: "object" },
        },
        brand_names: {
          type: "array",
          items: { type: "string" },
          description: "Names of the competitor brands being analyzed",
        },
      },
      required: ["ads", "brand_names"],
    },
  },
  {
    name: "download_ad_media",
    description:
      "Download ad media (image or video) from a public URL and store it in Voltic's media library for the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        media_url: {
          type: "string",
          description: "Public HTTPS URL of the image or video to download",
        },
        brand_name: {
          type: "string",
          description: "Brand name for file naming and organisation",
        },
        media_type: {
          type: "string",
          enum: ["image", "video"],
          description: "Type of media",
        },
        ad_index: {
          type: "number",
          description: "Optional index for file naming when downloading multiple ads from the same brand",
        },
      },
      required: ["media_url", "brand_name", "media_type"],
    },
  },
];

// ─── Method Dispatcher ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleMcpMethod(
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>,
  workspaceId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  switch (method) {
    // ── search_ads ──────────────────────────────────────────────────────────
    case "search_ads": {
      const result = await searchAdsLibrary({
        query: String(params.query ?? ""),
        activeOnly: Boolean(params.active_only ?? false),
        format: params.format ?? "all",
        sort: "newest",
        country: params.country ?? "ALL",
        scrapeCount: Number(params.limit ?? 20),
      });
      return result;
    }

    // ── list_boards ─────────────────────────────────────────────────────────
    case "list_boards": {
      const boards = await getBoards(workspaceId);
      return { boards };
    }

    // ── create_board ────────────────────────────────────────────────────────
    case "create_board": {
      const result = await createBoard(
        workspaceId,
        String(params.name ?? ""),
        params.description ? String(params.description) : undefined
      );
      return result;
    }

    // ── save_to_board ───────────────────────────────────────────────────────
    case "save_to_board": {
      if (!params.board_id) throw new Error("board_id is required");
      if (!params.ad_data) throw new Error("ad_data is required");

      // Accept ad_data as a DiscoverAd-shaped object
      const ad = params.ad_data as DiscoverAd;
      const result = await saveAdToBoard(workspaceId, String(params.board_id), ad);
      return result;
    }

    // ── list_competitors ────────────────────────────────────────────────────
    case "list_competitors": {
      const brands = await listCompetitorBrands(workspaceId);
      return { brands };
    }

    // ── get_dashboard_kpis ──────────────────────────────────────────────────
    case "get_dashboard_kpis": {
      const kpis = await getWorkspaceKPIs(workspaceId);
      return kpis;
    }

    // ── decompose_ad ────────────────────────────────────────────────────────
    case "decompose_ad": {
      if (!params.image_url) throw new Error("image_url is required");
      const result = await decomposeAdImage(String(params.image_url));
      return result;
    }

    // ── generate_variations ─────────────────────────────────────────────────
    case "generate_variations": {
      if (!params.asset_name) throw new Error("asset_name is required");
      if (!params.strategy) throw new Error("strategy is required");

      // Build the asset object expected by generateVariationText
      const asset = {
        name: String(params.asset_name),
        description: params.asset_description ? String(params.asset_description) : null,
      };

      // Optional competitor ad for inspiration
      let competitorAd: {
        brandName: string | null;
        headline: string | null;
        body: string | null;
        format: string;
      } | null = null;

      if (params.competitor_ad) {
        const ca = params.competitor_ad as Record<string, unknown>;
        competitorAd = {
          brandName: ca.brandName ? String(ca.brandName) : null,
          headline: ca.headline ? String(ca.headline) : null,
          body: ca.body ? String(ca.body) : null,
          format: ca.format ? String(ca.format) : "image",
        };
      }

      const result = await generateVariationText(
        competitorAd,
        asset,
        params.strategy,
        undefined, // brandGuidelines
        params.channel ? String(params.channel) : undefined
      );
      return result;
    }

    // ── analyze_ad ──────────────────────────────────────────────────────────
    case "analyze_ad": {
      if (!params.brand_name) throw new Error("brand_name is required");
      if (!params.format) throw new Error("format is required");
      if (!params.platforms) throw new Error("platforms is required");

      const result = await generateAdInsights({
        brandName: String(params.brand_name),
        headline: params.headline ? String(params.headline) : "",
        bodyText: params.body_text ? String(params.body_text) : "",
        format: String(params.format),
        platforms: Array.isArray(params.platforms) ? params.platforms.map(String) : [],
        landingPageUrl: params.landing_page_url ? String(params.landing_page_url) : null,
        runtimeDays: params.runtime_days ? Number(params.runtime_days) : 0,
        isActive: Boolean(params.is_active ?? false),
      });
      return result;
    }

    // ── compare_ads ─────────────────────────────────────────────────────────
    case "compare_ads": {
      if (!params.ads || !Array.isArray(params.ads)) {
        throw new Error("ads must be an array of 2–4 ad objects");
      }
      if (params.ads.length < 2 || params.ads.length > 4) {
        throw new Error("compare_ads requires 2 to 4 ads");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ads = (params.ads as any[]).map((ad: Record<string, unknown>) => ({
        id: String(ad.id ?? ""),
        pageName: String(ad.pageName ?? ad.page_name ?? ""),
        headline: String(ad.headline ?? ""),
        bodyText: String(ad.bodyText ?? ad.body_text ?? ""),
        mediaType: (ad.mediaType ?? ad.media_type ?? "image") as "image" | "video" | "carousel",
        platforms: Array.isArray(ad.platforms) ? ad.platforms.map(String) : [],
        linkUrl: ad.linkUrl ? String(ad.linkUrl) : null,
        runtimeDays: Number(ad.runtimeDays ?? ad.runtime_days ?? 0),
        isActive: Boolean(ad.isActive ?? ad.is_active ?? false),
        mediaThumbnailUrl: ad.mediaThumbnailUrl
          ? String(ad.mediaThumbnailUrl)
          : null,
      }));

      const result = await generateAdComparison(ads);
      return result;
    }

    // ── generate_competitor_report ──────────────────────────────────────────
    case "generate_competitor_report": {
      if (!params.ads || !Array.isArray(params.ads)) {
        throw new Error("ads must be an array of competitor ad objects");
      }
      if (!params.brand_names || !Array.isArray(params.brand_names)) {
        throw new Error("brand_names must be an array of strings");
      }

      // Map loose input to the CompetitorAd shape expected by generateCompetitorReport
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ads: CompetitorAd[] = (params.ads as any[]).map((ad: Record<string, unknown>) => ({
        id: String(ad.id ?? ""),
        competitorBrandId: String(ad.competitorBrandId ?? ad.competitor_brand_id ?? ""),
        workspaceId,
        metaLibraryId: String(ad.metaLibraryId ?? ad.meta_library_id ?? ""),
        headline: ad.headline ? String(ad.headline) : null,
        bodyText: ad.bodyText ?? ad.body_text ? String(ad.bodyText ?? ad.body_text) : null,
        format: String(ad.format ?? "image"),
        mediaType: String(ad.mediaType ?? ad.media_type ?? "image"),
        imageUrl: ad.imageUrl ? String(ad.imageUrl) : null,
        videoUrl: null,
        landingPageUrl: ad.landingPageUrl ? String(ad.landingPageUrl) : null,
        platforms: Array.isArray(ad.platforms) ? ad.platforms.map(String) : [],
        startDate: ad.startDate ? String(ad.startDate) : null,
        runtimeDays: Number(ad.runtimeDays ?? ad.runtime_days ?? 0),
        isActive: Boolean(ad.isActive ?? ad.is_active ?? false),
        adsLibraryUrl: ad.adsLibraryUrl ? String(ad.adsLibraryUrl) : null,
        scrapedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }));

      const brandNames = (params.brand_names as unknown[]).map(String);
      const result = await generateCompetitorReport(ads, brandNames);
      return result;
    }

    // ── download_ad_media ───────────────────────────────────────────────────
    case "download_ad_media": {
      if (!params.media_url) throw new Error("media_url is required");
      if (!params.brand_name) throw new Error("brand_name is required");
      if (!params.media_type) throw new Error("media_type is required");

      const mediaType = String(params.media_type) as "image" | "video";
      if (mediaType !== "image" && mediaType !== "video") {
        throw new Error("media_type must be 'image' or 'video'");
      }

      const result = await downloadAndStoreMedia({
        mediaUrl: String(params.media_url),
        workspaceId,
        brandName: String(params.brand_name),
        mediaType,
        adIndex: params.ad_index !== undefined ? Number(params.ad_index) : 0,
      });
      return result;
    }

    // ── Unknown ─────────────────────────────────────────────────────────────
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
