"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  ExternalLink,
  Plus,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Layers,
  Check,
  Sparkles,
} from "lucide-react";
import {
  fetchDiscoverAds,
  fetchBoards,
  saveToBoard,
  analyzeAd,
  fetchExistingInsights,
} from "../actions";
import { InsightsPanel } from "@/components/shared/insights-panel";
import type {
  DiscoverAd,
  DiscoverSearchParams,
  BoardOption,
  AdInsightRecord,
} from "@/types/discover";

// ─── Platform Icons ─────────────────────────────────────────────────────────

function PlatformIcons({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex gap-1">
      {platforms.includes("facebook") && (
        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">FB</span>
      )}
      {platforms.includes("instagram") && (
        <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">IG</span>
      )}
      {platforms.includes("messenger") && (
        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">MSG</span>
      )}
      {platforms.includes("audience_network") && (
        <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">AN</span>
      )}
    </div>
  );
}

// ─── Format Icon ────────────────────────────────────────────────────────────

function FormatIcon({ format }: { format: string }) {
  switch (format) {
    case "video":
      return <Video className="h-3.5 w-3.5" />;
    case "carousel":
      return <Layers className="h-3.5 w-3.5" />;
    default:
      return <ImageIcon className="h-3.5 w-3.5" />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DiscoverClient() {
  // Search state
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [format, setFormat] = useState<DiscoverSearchParams["format"]>("all");
  const [sort, setSort] = useState<DiscoverSearchParams["sort"]>("newest");
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);

  // Results state
  const [ads, setAds] = useState<DiscoverAd[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Board state
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [savingAdId, setSavingAdId] = useState<string | null>(null);
  const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set());

  // Insight state
  const [insightsMap, setInsightsMap] = useState<Record<string, AdInsightRecord>>({});
  const [analyzingAdId, setAnalyzingAdId] = useState<string | null>(null);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Load boards on mount
  useEffect(() => {
    fetchBoards().then((result) => {
      if (!("error" in result)) {
        setBoards(result);
      }
    });
  }, []);

  // Elapsed timer for loading state
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setElapsedSecs(0);
      timerRef.current = setInterval(() => {
        setElapsedSecs((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  // Pre-load existing insights for returned ads
  const loadExistingInsights = useCallback(async (adIds: string[]) => {
    if (adIds.length === 0) return;
    const result = await fetchExistingInsights(adIds);
    if (result.data) {
      setInsightsMap((prev) => ({ ...prev, ...result.data }));
    }
  }, []);

  // Search function
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setPage(1);
    setExpandedInsightId(null);

    const result = await fetchDiscoverAds({
      query: query.trim(),
      activeOnly,
      format,
      sort,
      page: 1,
      perPage,
    });

    setAds(result.ads);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
    setLoading(false);

    // Pre-load insights for these ads
    const adIds = result.ads.map((a) => a.id);
    loadExistingInsights(adIds);
  }, [query, activeOnly, format, sort, perPage, loadExistingInsights]);

  // Paginate
  const handlePageChange = useCallback(
    async (newPage: number) => {
      setLoading(true);
      setPage(newPage);
      setExpandedInsightId(null);

      const result = await fetchDiscoverAds({
        query: query.trim(),
        activeOnly,
        format,
        sort,
        page: newPage,
        perPage,
      });

      setAds(result.ads);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setLoading(false);

      // Pre-load insights
      const adIds = result.ads.map((a) => a.id);
      loadExistingInsights(adIds);
    },
    [query, activeOnly, format, sort, perPage, loadExistingInsights]
  );

  // Save to board
  const handleSaveToBoard = async (ad: DiscoverAd, boardId: string) => {
    setSavingAdId(ad.id);
    const result = await saveToBoard({ boardId, ad });
    if (result.success) {
      setSavedAdIds((prev) => new Set(prev).add(ad.id));
    }
    setSavingAdId(null);
  };

  // Analyze ad
  const handleAnalyzeAd = async (ad: DiscoverAd) => {
    // If already cached, just toggle open
    if (insightsMap[ad.id]) {
      setExpandedInsightId((prev) => (prev === ad.id ? null : ad.id));
      return;
    }

    setAnalyzingAdId(ad.id);
    const result = await analyzeAd({
      id: ad.id,
      pageName: ad.pageName,
      headline: ad.headline,
      bodyText: ad.bodyText,
      mediaType: ad.mediaType,
      platforms: ad.platforms,
      linkUrl: ad.linkUrl,
      runtimeDays: ad.runtimeDays,
      isActive: ad.isActive,
    });

    if (result.data) {
      setInsightsMap((prev) => ({ ...prev, [ad.id]: result.data! }));
      setExpandedInsightId(ad.id);
    }
    // TODO: show error toast when result.error
    setAnalyzingAdId(null);
  };

  // Re-search when filters change (if already searched)
  useEffect(() => {
    if (hasSearched) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, format, sort, perPage]);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-sm text-muted-foreground">
          Browse the Meta Ads Library for competitor ads and creative inspiration.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brand name (e.g. Nike, Glossier)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8"
          />
        </div>
        <Button onClick={handleSearch} disabled={!query.trim() || loading}>
          {loading ? `Scraping... ${elapsedSecs}s` : "Search"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Active Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="active-toggle"
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
          />
          <Label htmlFor="active-toggle" className="text-sm">
            Active only
          </Label>
        </div>

        {/* Format Filter */}
        <Select value={format} onValueChange={(v) => setFormat(v as DiscoverSearchParams["format"])}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as DiscoverSearchParams["sort"])}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="impressions">Most Impressions</SelectItem>
          </SelectContent>
        </Select>

        {/* Per Page */}
        <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="24">24</SelectItem>
          </SelectContent>
        </Select>

        {hasSearched && (
          <span className="text-sm text-muted-foreground ml-auto">
            {totalCount} results
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 bg-muted/50 rounded-lg px-6 py-3">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium">
                  Scraping Meta Ad Library for &ldquo;{query}&rdquo;...
                </p>
                <p className="text-xs text-muted-foreground">
                  {elapsedSecs < 10
                    ? "Starting scraper..."
                    : elapsedSecs < 60
                      ? `Fetching ads... (${elapsedSecs}s)`
                      : `Almost there... (${Math.floor(elapsedSecs / 60)}m ${elapsedSecs % 60}s)`}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-[200px] w-full rounded" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && hasSearched && ads.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No ads found for &ldquo;{query}&rdquo;. Try a different brand name.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !loading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Enter a brand name above to search the Meta Ads Library.
          </p>
        </div>
      )}

      {/* Ad Grid */}
      {!loading && ads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              boards={boards}
              isSaving={savingAdId === ad.id}
              isSaved={savedAdIds.has(ad.id)}
              isAnalyzing={analyzingAdId === ad.id}
              insight={insightsMap[ad.id] ?? null}
              isExpanded={expandedInsightId === ad.id}
              onSaveToBoard={(boardId) => handleSaveToBoard(ad, boardId)}
              onAnalyze={() => handleAnalyzeAd(ad)}
              onToggleInsight={() =>
                setExpandedInsightId((prev) => (prev === ad.id ? null : ad.id))
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Ad Card ────────────────────────────────────────────────────────────────

interface AdCardProps {
  ad: DiscoverAd;
  boards: BoardOption[];
  isSaving: boolean;
  isSaved: boolean;
  isAnalyzing: boolean;
  insight: AdInsightRecord | null;
  isExpanded: boolean;
  onSaveToBoard: (boardId: string) => void;
  onAnalyze: () => void;
  onToggleInsight: () => void;
}

function AdCard({
  ad,
  boards,
  isSaving,
  isSaved,
  isAnalyzing,
  insight,
  isExpanded,
  onSaveToBoard,
  onAnalyze,
  onToggleInsight,
}: AdCardProps) {
  const startDate = new Date(ad.startDate + "T00:00:00");
  const dateStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header: Brand + Status */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">{ad.pageName}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ad.isActive && (
              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                Live
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {ad.runtimeDays}d
            </Badge>
          </div>
        </div>

        {/* Media */}
        <div className="relative bg-muted h-[200px] flex items-center justify-center mx-4 rounded overflow-hidden">
          {ad.mediaThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.mediaThumbnailUrl}
              alt={ad.headline}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FormatIcon format={ad.mediaType} />
              <span className="text-xs capitalize">{ad.mediaType}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3 space-y-2">
          {/* Format + Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FormatIcon format={ad.mediaType} />
            <span className="capitalize">{ad.mediaType}</span>
            <span>&middot;</span>
            <span>{dateStr}</span>
          </div>

          {/* Headline */}
          <p className="text-sm font-medium line-clamp-2">{ad.headline}</p>

          {/* Body */}
          <p className="text-xs text-muted-foreground line-clamp-2">{ad.bodyText}</p>

          {/* URL */}
          {ad.linkUrl && (
            <p className="text-xs text-blue-600 truncate">{ad.linkUrl}</p>
          )}

          {/* Platform Icons */}
          <PlatformIcons platforms={ad.platforms} />

          {/* Impressions */}
          {ad.impressionRange && (
            <p className="text-xs text-muted-foreground">
              {ad.impressionRange.lower.toLocaleString()}–{ad.impressionRange.upper.toLocaleString()} impressions
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Add to Board */}
          {isSaved ? (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
              Saved
            </Button>
          ) : boards.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isSaving}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Add to Board"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="start">
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-2">Select board</p>
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors"
                      onClick={() => onSaveToBoard(board.id)}
                    >
                      {board.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              No Boards
            </Button>
          )}

          {/* Analyze / Insights Toggle */}
          {insight ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleInsight}
              className="flex-shrink-0"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              {isExpanded ? "Hide" : "Insights"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="flex-shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <div className="mr-1.5 h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Analyze (2cr)
                </>
              )}
            </Button>
          )}

          {/* View in Ads Library */}
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a
              href={ad.adsLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {/* Insights Panel (expandable) */}
        {insight && isExpanded && (
          <div className="border-t px-4 py-3 bg-amber-50/50">
            <InsightsPanel insights={insight.insights} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
