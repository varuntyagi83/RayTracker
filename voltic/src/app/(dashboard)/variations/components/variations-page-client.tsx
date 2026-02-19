"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Clock,
  Upload,
  X,
  Image as ImageIcon,
  Palette,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import {
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
  VARIATION_CREDIT_COST,
  PRODUCT_ANGLE_LABELS,
  LIGHTING_STYLE_LABELS,
  BACKGROUND_STYLE_LABELS,
} from "@/types/variations";
import type {
  VariationStrategy,
  VariationSource,
  ProductAngle,
  LightingStyle,
  BackgroundStyle,
  BrandGuidelines,
} from "@/types/variations";
import type { SavedAd, Board } from "@/types/boards";
import type { Asset } from "@/types/assets";
import type { VariationWithContext } from "@/lib/data/variations";
import {
  fetchAllVariations,
  fetchBoardsForSelection,
  fetchBoardAds,
  fetchAssetsForVariation,
  deleteVariationFromHistory,
} from "../actions";
import { generateVariationsAction } from "@/app/(dashboard)/boards/actions";
import { createAssetAction } from "@/app/(dashboard)/assets/actions";

// ─── Channel Definitions ─────────────────────────────────────────────────────

const CHANNELS = [
  { id: "facebook", label: "Facebook", short: "FB" },
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "tiktok", label: "TikTok", short: "TT" },
  { id: "linkedin", label: "LinkedIn", short: "LI" },
  { id: "google", label: "Google Ads", short: "G" },
] as const;

const ALL_STRATEGIES: VariationStrategy[] = [
  "hero_product",
  "curiosity",
  "pain_point",
  "proof_point",
  "image_only",
  "text_only",
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VariationsPageClient() {
  // ── Source toggle ──
  const [variationSource, setVariationSource] = useState<VariationSource>("competitor");

  // ── Board / Competitor selection ──
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [boardAds, setBoardAds] = useState<SavedAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [selectedAd, setSelectedAd] = useState<SavedAd | null>(null);

  // ── Asset selection ──
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetMode, setAssetMode] = useState<string>("existing");

  // ── Upload new asset form ──
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadSaving, setUploadSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Creative options (asset-based) ──
  const [angle, setAngle] = useState<string>("");
  const [lighting, setLighting] = useState<string>("");
  const [background, setBackground] = useState<string>("");
  const [customInstruction, setCustomInstruction] = useState<string>("");

  // ── Channel ──
  const [channel, setChannel] = useState<string>("facebook");

  // ── Strategies ──
  const [selectedStrategies, setSelectedStrategies] = useState<
    Set<VariationStrategy>
  >(new Set());

  // ── Generation ──
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  // ── History ──
  const [history, setHistory] = useState<VariationWithContext[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // ── Brand guidelines ──
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);
  const [guidelinesExpanded, setGuidelinesExpanded] = useState(false);
  const hasBrandGuidelines = !!(
    brandGuidelines?.brandName ||
    brandGuidelines?.brandVoice ||
    brandGuidelines?.targetAudience ||
    brandGuidelines?.dosAndDonts ||
    brandGuidelines?.colorPalette
  );

  // ── Data loaders ──

  const loadBoards = useCallback(async () => {
    const result = await fetchBoardsForSelection();
    if (result.data) setBoards(result.data);
    setBoardsLoading(false);
  }, []);

  const loadAssets = useCallback(async () => {
    const result = await fetchAssetsForVariation();
    if (result.data) setAssets(result.data);
    setAssetsLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    const result = await fetchAllVariations();
    if (result.data) setHistory(result.data);
    setHistoryLoading(false);
  }, []);

  const checkBrandGuidelines = useCallback(async () => {
    const { fetchBrandGuidelines } = await import(
      "@/app/(dashboard)/settings/actions"
    );
    const result = await fetchBrandGuidelines();
    if (result.data) {
      setBrandGuidelines(result.data);
    }
  }, []);

  useEffect(() => {
    loadBoards();
    loadAssets();
    loadHistory();
    checkBrandGuidelines();
    track("variations_page_viewed");
  }, [loadBoards, loadAssets, loadHistory, checkBrandGuidelines]);

  // ── Board selection → load ads ──

  const handleBoardSelect = async (boardId: string) => {
    setSelectedBoardId(boardId);
    setSelectedAd(null);
    setBoardAds([]);
    if (!boardId) return;

    setAdsLoading(true);
    const result = await fetchBoardAds({ boardId });
    if (result.data) {
      setBoardAds(result.data.ads);
    }
    setAdsLoading(false);
  };

  // ── Strategy toggle ──

  const toggleStrategy = (strategy: VariationStrategy) => {
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(strategy)) next.delete(strategy);
      else next.add(strategy);
      return next;
    });
  };

  // ── Upload new asset ──

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and GIF allowed");
      return;
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const clearUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadName("");
    setUploadDesc("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateAsset = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.error("Name and image are required");
      return;
    }
    setUploadSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", uploadName.trim());
      formData.set("description", uploadDesc.trim());
      formData.set("image", uploadFile);

      const result = await createAssetAction(formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create product");
        return;
      }

      toast.success("Product added");
      track("asset_created", {
        asset_id: result.id ?? "",
        name: uploadName.trim(),
      });

      // Reload assets and auto-select the new one
      const refreshed = await fetchAssetsForVariation();
      if (refreshed.data) {
        setAssets(refreshed.data);
        if (result.id) setSelectedAssetId(result.id);
      }

      clearUpload();
      setAssetMode("existing");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create product"
      );
    } finally {
      setUploadSaving(false);
    }
  };

  // ── Source toggle handler ──

  const handleSourceChange = (newSource: VariationSource) => {
    setVariationSource(newSource);
    setSelectedStrategies(new Set());
    setError("");
    track("variation_source_toggled", { source: newSource });
  };

  // ── Generate ──

  const totalCost = selectedStrategies.size * VARIATION_CREDIT_COST;

  const canGenerate =
    variationSource === "competitor"
      ? selectedAd && selectedAssetId && selectedStrategies.size > 0 && !generating
      : selectedAssetId && selectedStrategies.size > 0 && !generating;

  const handleGenerate = async () => {
    if (variationSource === "competitor" && !selectedAd) return;
    if (!selectedAssetId || selectedStrategies.size === 0) return;

    setGenerating(true);
    setError("");

    try {
      const strategies = Array.from(selectedStrategies);

      const creativeOpts =
        variationSource === "asset"
          ? {
              angle: angle && angle !== "auto" ? angle : undefined,
              lighting: lighting && lighting !== "auto" ? lighting : undefined,
              background: background && background !== "auto" ? background : undefined,
              customInstruction: customInstruction.trim() || undefined,
            }
          : undefined;

      const result = await generateVariationsAction({
        source: variationSource,
        savedAdId: variationSource === "competitor" ? selectedAd!.id : undefined,
        assetId: selectedAssetId,
        strategies,
        channel,
        creativeOptions: creativeOpts,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        const failures = (result.results ?? []).filter((r) => !r.success);
        if (failures.length > 0 && failures.length < strategies.length) {
          toast.warning(`${failures.length} variation(s) failed to generate.`);
        } else if (failures.length === strategies.length) {
          toast.error("All variations failed to generate.");
        } else {
          toast.success(
            `${strategies.length} variation(s) generated successfully!`
          );
        }

        track("variation_generated_from_page", {
          source: variationSource,
          saved_ad_id: variationSource === "competitor" ? selectedAd?.id : undefined,
          asset_id: selectedAssetId,
          strategies: strategies.length,
          channel,
          has_creative_options: !!creativeOpts,
        });
      }

      // Reload history
      await loadHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete variation ──

  const handleDeleteVariation = async (id: string) => {
    const result = await deleteVariationFromHistory({ variationId: id });
    if (result.success) {
      setHistory((prev) => prev.filter((v) => v.id !== id));
      toast.success("Variation deleted");
      track("variation_deleted_from_history", { variation_id: id });
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  // ── Step numbering helper ──
  const isAssetFlow = variationSource === "asset";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Variations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate ad variations from competitor ads or your own assets using AI
          strategies.
        </p>
      </div>

      {/* ── Generation Form ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Source Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
            <button
              type="button"
              onClick={() => handleSourceChange("competitor")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                variationSource === "competitor"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              From Competitor Ad
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange("asset")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                variationSource === "asset"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              From Your Asset
            </button>
          </div>

          {/* ── COMPETITOR FLOW: Step 1 — Select Competitor Ad ── */}
          {!isAssetFlow && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="size-6 p-0 flex items-center justify-center text-xs font-bold"
                >
                  1
                </Badge>
                <label className="text-sm font-medium">
                  Select Competitor Ad
                </label>
              </div>

              {boardsLoading ? (
                <Skeleton className="h-10 w-full max-w-sm" />
              ) : boards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No boards found. Save ads to a board from the Discover page
                  first.
                </p>
              ) : (
                <>
                  <Select
                    value={selectedBoardId}
                    onValueChange={handleBoardSelect}
                  >
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder="Choose a board..." />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {adsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading ads...
                    </div>
                  )}

                  {!adsLoading && selectedBoardId && boardAds.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No ads in this board.
                    </p>
                  )}

                  {boardAds.length > 0 && (
                    <ScrollArea className="w-full">
                      <div className="flex gap-3 pb-3">
                        {boardAds.map((ad) => (
                          <CompetitorAdCard
                            key={ad.id}
                            ad={ad}
                            selected={selectedAd?.id === ad.id}
                            onSelect={() => setSelectedAd(ad)}
                          />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step: Select Your Product ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="size-6 p-0 flex items-center justify-center text-xs font-bold"
              >
                {isAssetFlow ? "1" : "2"}
              </Badge>
              <label className="text-sm font-medium">
                Select Your Product
              </label>
            </div>

            <Tabs value={assetMode} onValueChange={setAssetMode}>
              <TabsList className="mb-3">
                <TabsTrigger value="existing">Choose Existing</TabsTrigger>
                <TabsTrigger value="upload">Upload New</TabsTrigger>
              </TabsList>

              <TabsContent value="existing">
                {assetsLoading ? (
                  <Skeleton className="h-10 w-full max-w-sm" />
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products found. Switch to &ldquo;Upload New&rdquo; to add
                    one.
                  </p>
                ) : (
                  <Select
                    value={selectedAssetId}
                    onValueChange={setSelectedAssetId}
                  >
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TabsContent>

              <TabsContent value="upload">
                <div className="space-y-3 max-w-sm">
                  {uploadPreview ? (
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="w-full h-40 object-contain"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 size-7"
                        onClick={clearUpload}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground"
                    >
                      <Upload className="size-6" />
                      <span className="text-xs">Click to upload</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <Input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Product name"
                  />
                  <Textarea
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Brief description (optional)"
                    rows={2}
                  />
                  <Button
                    onClick={handleCreateAsset}
                    disabled={!uploadFile || !uploadName.trim() || uploadSaving}
                    size="sm"
                  >
                    {uploadSaving ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 size-3.5" />
                    )}
                    {uploadSaving ? "Creating..." : "Create & Select"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── ASSET FLOW: Step 2 — Creative Direction ── */}
          {isAssetFlow && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="size-6 p-0 flex items-center justify-center text-xs font-bold"
                >
                  2
                </Badge>
                <label className="text-sm font-medium">Creative Direction</label>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Angle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    <Palette className="inline size-3 mr-1" />
                    Product Angle
                  </label>
                  <Select value={angle} onValueChange={setAngle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {(Object.entries(PRODUCT_ANGLE_LABELS) as [ProductAngle, string][]).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lighting */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Lighting
                  </label>
                  <Select value={lighting} onValueChange={setLighting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {(Object.entries(LIGHTING_STYLE_LABELS) as [LightingStyle, string][]).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Background */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Background
                  </label>
                  <Select value={background} onValueChange={setBackground}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {(Object.entries(BACKGROUND_STYLE_LABELS) as [BackgroundStyle, string][]).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Instruction */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Custom Instruction
                  </label>
                  <Textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. 'Show product on a kitchen counter', 'Use pastel tones'"
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Channel ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="size-6 p-0 flex items-center justify-center text-xs font-bold"
              >
                {isAssetFlow ? "3" : "3"}
              </Badge>
              <label className="text-sm font-medium">Choose Channel</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    channel === ch.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Step: Strategies ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="size-6 p-0 flex items-center justify-center text-xs font-bold"
              >
                {isAssetFlow ? "4" : "4"}
              </Badge>
              <label className="text-sm font-medium">Select Strategies</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALL_STRATEGIES.map((strategy) => {
                const selected = selectedStrategies.has(strategy);
                return (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => toggleStrategy(strategy)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {STRATEGY_LABELS[strategy]}
                      </span>
                      {selected && <Check className="size-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {STRATEGY_DESCRIPTIONS[strategy]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand Guidelines Preview */}
          {hasBrandGuidelines && brandGuidelines ? (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <button
                type="button"
                onClick={() => setGuidelinesExpanded(!guidelinesExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="size-4" />
                  Brand guidelines will be applied
                  {brandGuidelines.brandName && (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700">
                      {brandGuidelines.brandName}
                    </Badge>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 text-emerald-600 dark:text-emerald-400 transition-transform ${
                    guidelinesExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
              {guidelinesExpanded && (
                <div className="px-4 pb-3 space-y-2 text-xs text-muted-foreground border-t border-emerald-200 dark:border-emerald-800 pt-3">
                  {brandGuidelines.brandVoice && (
                    <div>
                      <span className="font-medium text-foreground">Voice:</span>{" "}
                      {brandGuidelines.brandVoice}
                    </div>
                  )}
                  {brandGuidelines.colorPalette && (
                    <div>
                      <span className="font-medium text-foreground">Colors:</span>{" "}
                      {brandGuidelines.colorPalette}
                    </div>
                  )}
                  {brandGuidelines.targetAudience && (
                    <div>
                      <span className="font-medium text-foreground">Audience:</span>{" "}
                      {brandGuidelines.targetAudience}
                    </div>
                  )}
                  {brandGuidelines.dosAndDonts && (
                    <div>
                      <span className="font-medium text-foreground">Guidelines:</span>{" "}
                      <span className="line-clamp-2">{brandGuidelines.dosAndDonts}</span>
                    </div>
                  )}
                  <Link
                    href="/brand-guidelines"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                  >
                    Edit guidelines <ExternalLink className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/25 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                No brand guidelines set — variations will use generic style
              </span>
              <Link
                href="/brand-guidelines"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Set up guidelines <ExternalLink className="size-3" />
              </Link>
            </div>
          )}

          {selectedStrategies.size > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">
                {selectedStrategies.size} strategy
                {selectedStrategies.size !== 1 ? "ies" : "y"}
                {channel && (
                  <span className="text-muted-foreground">
                    {" "}
                    &middot;{" "}
                    {CHANNELS.find((c) => c.id === channel)?.label ?? channel}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  &middot;{" "}
                  {variationSource === "competitor"
                    ? "Competitor-inspired"
                    : "Asset-based"}
                </span>
              </span>
              <Badge variant="secondary">{totalCost} credits</Badge>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 size-4" />
            )}
            {generating
              ? "Generating..."
              : `Generate Variations${totalCost > 0 ? ` (${totalCost} credits)` : ""}`}
          </Button>
        </CardContent>
      </Card>

      {/* ── History ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Variation History</h2>

        {historyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px] rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">No variations yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a source, your product, and strategies above to
              generate your first variations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {history.map((v) => (
              <VariationHistoryCard
                key={v.id}
                variation={v}
                onDelete={() => handleDeleteVariation(v.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Competitor Ad Card (inline selector) ───────────────────────────────────

function CompetitorAdCard({
  ad,
  selected,
  onSelect,
}: {
  ad: SavedAd;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 w-40 rounded-lg border overflow-hidden transition-all text-left ${
        selected
          ? "ring-2 ring-primary border-primary"
          : "border-border hover:border-muted-foreground/50"
      }`}
    >
      <div className="aspect-video bg-muted relative">
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imageUrl}
            alt={ad.brandName ?? "Ad"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-6 text-muted-foreground/30" />
          </div>
        )}
        {selected && (
          <div className="absolute top-1.5 right-1.5">
            <div className="size-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="size-3 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate">
          {ad.brandName ?? "Unknown brand"}
        </p>
        {ad.headline && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {ad.headline}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Variation History Card ─────────────────────────────────────────────────

function VariationHistoryCard({
  variation,
  onDelete,
}: {
  variation: VariationWithContext;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const isCompleted = variation.status === "completed";
  const isFailed = variation.status === "failed";

  const dateStr = new Date(variation.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        {/* Image */}
        <div className="aspect-video bg-muted relative">
          {variation.generatedImageUrl ? (
            <Image
              src={variation.generatedImageUrl}
              alt="Generated variation"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 right-2">
            {isCompleted && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                <Check className="size-3 mr-0.5" />
                Completed
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertCircle className="size-3 mr-0.5" />
                Failed
              </Badge>
            )}
            {!isCompleted && !isFailed && (
              <Badge variant="secondary" className="text-[10px]">
                <Loader2 className="size-3 mr-0.5 animate-spin" />
                Pending
              </Badge>
            )}
          </div>

          {/* Strategy badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-[10px]">
              {STRATEGY_LABELS[variation.strategy]}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          {variation.generatedHeadline && (
            <p className="text-sm font-semibold line-clamp-1">
              {variation.generatedHeadline}
            </p>
          )}
          {variation.generatedBody && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {variation.generatedBody}
            </p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            {dateStr}
            {variation.source === "competitor" && variation.adBrandName && (
              <>
                <span>&middot;</span>
                <span className="truncate max-w-[80px]">
                  vs {variation.adBrandName}
                </span>
              </>
            )}
            {variation.source === "asset" && (
              <>
                <span>&middot;</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  Asset
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {variation.assetName}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
