import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { searchMetaPages } from "@/lib/meta/page-search";

export const runtime = "nodejs";
export const maxDuration = 15;

const schema = z.object({
  query: z.string().min(1).max(200),
  country: z.string().max(3).default("ALL"),
});

// Simple in-process cache: "query:country" → { pages, ts }
const cache = new Map<string, { pages: Awaited<ReturnType<typeof searchMetaPages>>; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

export async function GET(req: NextRequest) {
  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const parsed = schema.safeParse({
    query: searchParams.get("query") ?? "",
    country: searchParams.get("country") ?? "ALL",
  });

  if (!parsed.success) {
    return NextResponse.json({ pages: [] });
  }

  const { query, country } = parsed.data;
  const cacheKey = `${query.toLowerCase().trim()}:${country}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ pages: cached.pages });
  }

  const pages = await searchMetaPages(query, country);

  cache.set(cacheKey, { pages, ts: Date.now() });

  return NextResponse.json({ pages });
}
