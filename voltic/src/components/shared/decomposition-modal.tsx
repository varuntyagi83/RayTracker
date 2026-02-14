"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Loader2,
  Scissors,
  Save,
  Wand2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  Palette,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import {
  useDecomposition,
  type DecompositionStatus,
} from "@/hooks/use-decomposition";
import type { SourceType, ExtractedText } from "@/types/decomposition";
import type { CreativeImage, CreativeText } from "@/types/variations";

// ─── Props ──────────────────────────────────────────────────────────────────

interface DecompositionModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  sourceType: SourceType;
  sourceId?: string;
  onSendToBuilder?: (images: CreativeImage[], texts: CreativeText[]) => void;
}

// ─── Badge color map ────────────────────────────────────────────────────────

const TEXT_TYPE_COLORS: Record<string, string> = {
  headline: "bg-blue-100 text-blue-700",
  subheadline: "bg-indigo-100 text-indigo-700",
  body: "bg-gray-100 text-gray-700",
  cta: "bg-emerald-100 text-emerald-700",
  legal: "bg-yellow-100 text-yellow-700",
  brand: "bg-orange-100 text-orange-700",
};

// ─── Status messages ────────────────────────────────────────────────────────

function StatusMessage({ status }: { status: DecompositionStatus }) {
  switch (status) {
    case "analyzing":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyzing ad with GPT-4o Vision...
        </div>
      );
    case "generating":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Generating clean product image...
        </div>
      );
    default:
      return null;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DecompositionModal({
  open,
  onClose,
  imageUrl,
  sourceType,
  sourceId,
  onSendToBuilder,
}: DecompositionModalProps) {
  const {
    status,
    result,
    error,
    decompose,
    saveAsAsset,
    getTextsForBuilder,
    reset,
  } = useDecomposition();

  // Image comparison toggle
  const [showClean, setShowClean] = useState(false);

  // Editable texts (local copy for editing)
  const [editedTexts, setEditedTexts] = useState<ExtractedText[]>([]);

  // Save as Asset form
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Analysis collapsible
  const [analysisOpen, setAnalysisOpen] = useState(false);

  // Start decomposition when modal opens
  useEffect(() => {
    if (open && imageUrl) {
      reset();
      setShowClean(false);
      setShowSaveForm(false);
      setAnalysisOpen(false);
      decompose(imageUrl, sourceType, sourceId);
    }
  }, [open, imageUrl, sourceType, sourceId, decompose, reset]);

  // Populate editable texts when result arrives
  useEffect(() => {
    if (result?.extractedTexts) {
      setEditedTexts([...result.extractedTexts]);
      // Pre-fill asset name from product description
      if (result.productAnalysis?.description) {
        setAssetName(result.productAnalysis.description.slice(0, 100));
        setAssetDescription("Extracted from ad decomposition (marketing text removed)");
      }
    }
  }, [result]);

  const handleTextEdit = useCallback(
    (index: number, newContent: string) => {
      setEditedTexts((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], content: newContent };
        return updated;
      });
      if (result?.id) {
        track("decomposition_text_edited", {
          decomposition_id: result.id,
          text_type: editedTexts[index]?.type ?? "unknown",
        });
      }
    },
    [result, editedTexts]
  );

  const handleToggleComparison = useCallback(() => {
    const next = !showClean;
    setShowClean(next);
    if (result?.id) {
      track("decomposition_comparison_toggled", {
        decomposition_id: result.id,
        showing: next ? "clean" : "original",
      });
    }
  }, [showClean, result]);

  const handleSaveAsAsset = useCallback(async () => {
    setSaving(true);
    try {
      const assetResult = await saveAsAsset();
      track("decomposition_asset_saved", {
        decomposition_id: result?.id ?? "",
        asset_id: assetResult.asset_id,
      });
      toast.success("Saved as asset", {
        description: assetResult.name,
      });
      setShowSaveForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [saveAsAsset, result]);

  const handleSendToBuilder = useCallback(async () => {
    if (!onSendToBuilder || !result) return;

    try {
      const texts = await getTextsForBuilder();

      // Build CreativeImage[] from clean image (or original if no clean)
      const images: CreativeImage[] = [];
      const cleanUrl = result.cleanImageUrl ?? imageUrl;
      images.push({
        id: `decompose-${result.id}`,
        url: cleanUrl,
        name: "Decomposed product image",
      });

      // Build CreativeText[] from marketing texts (group headlines + bodies)
      const headlines = texts.filter((t) => t.role === "headline");
      const bodies = texts.filter((t) => t.role === "body");

      const creativeTexts: CreativeText[] = [];
      // Match headlines with bodies, or create individual entries
      const maxLen = Math.max(headlines.length, bodies.length, 1);
      for (let i = 0; i < maxLen; i++) {
        creativeTexts.push({
          id: `decompose-txt-${i}`,
          headline: headlines[i]?.content ?? headlines[0]?.content ?? "",
          body: bodies[i]?.content ?? bodies[0]?.content ?? "",
        });
      }

      track("decomposition_sent_to_builder", {
        decomposition_id: result.id,
        image_count: images.length,
        text_count: creativeTexts.length,
      });

      onSendToBuilder(images, creativeTexts);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to prepare data";
      toast.error(msg);
    }
  }, [onSendToBuilder, result, imageUrl, getTextsForBuilder, onClose]);

  const marketingTexts = editedTexts.filter((t) => t.type !== "brand");
  const brandTexts = editedTexts.filter((t) => t.type === "brand");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="size-5" />
            Ad Decomposition
          </DialogTitle>
          <DialogDescription>
            Extract text, product, and layout elements from the ad image.
            {" "}
            <Badge variant="secondary" className="text-xs">
              10 credits
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* ── Image Section ─────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Images</h3>
                {result?.cleanImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleComparison}
                  >
                    {showClean ? (
                      <EyeOff className="mr-1.5 size-3.5" />
                    ) : (
                      <Eye className="mr-1.5 size-3.5" />
                    )}
                    {showClean ? "Show Original" : "Show Clean"}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Original image */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    Original Ad
                  </p>
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                    <Image
                      src={imageUrl}
                      alt="Original ad"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Clean image */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    Clean Product Image
                  </p>
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                    {status === "analyzing" || status === "generating" ? (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-8 text-muted-foreground/40 animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          {status === "analyzing"
                            ? "Analyzing..."
                            : "Generating..."}
                        </span>
                      </div>
                    ) : status === "completed" ? (
                      <>
                        <Image
                          src={result?.cleanImageUrl || imageUrl}
                          alt="Clean product"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                        />
                        {!result?.cleanImageUrl && (
                          <div className="absolute bottom-2 inset-x-2 text-center">
                            <Badge variant="secondary" className="text-[10px]">
                              No overlay text — original used
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <StatusMessage status={status} />
            </div>

            {/* ── Error State ──────────────────────────────────── */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* ── Extracted Texts Section ──────────────────────── */}
            {status === "completed" && editedTexts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Extracted Texts</h3>

                {/* Marketing texts (editable) */}
                {marketingTexts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Marketing overlay text — editable
                    </p>
                    {marketingTexts.map((text, i) => {
                      const globalIndex = editedTexts.findIndex(
                        (t) => t === text
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg border bg-card"
                        >
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${TEXT_TYPE_COLORS[text.type] ?? ""}`}
                            >
                              {text.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {text.position}
                            </Badge>
                          </div>
                          <Input
                            value={text.content}
                            onChange={(e) =>
                              handleTextEdit(
                                globalIndex >= 0 ? globalIndex : i,
                                e.target.value
                              )
                            }
                            className="flex-1 h-8 text-sm"
                          />
                          <span className="text-[10px] text-muted-foreground shrink-0 mt-1.5">
                            {Math.round(text.confidence * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Brand/packaging texts (read-only) */}
                {brandTexts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Product packaging text — preserved
                    </p>
                    {brandTexts.map((text, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/50 opacity-70"
                      >
                        <Badge
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${TEXT_TYPE_COLORS.brand}`}
                        >
                          brand
                        </Badge>
                        <span className="text-sm flex-1">{text.content}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {Math.round(text.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Analysis Section (Collapsible) ──────────────── */}
            {status === "completed" && result && (
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors w-full">
                  {analysisOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  Detailed Analysis
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Product */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Package className="size-3.5" />
                      Product
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Detected:</span>
                        <Badge
                          variant={
                            result.productAnalysis.detected
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {result.productAnalysis.detected ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {result.productAnalysis.description && (
                        <p>{result.productAnalysis.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Position: {result.productAnalysis.position}
                        </span>
                        <span>
                          Area: {result.productAnalysis.occupies_percent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Background */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Palette className="size-3.5" />
                      Background
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {result.backgroundAnalysis.type}
                        </Badge>
                      </div>
                      {result.backgroundAnalysis.description && (
                        <p>{result.backgroundAnalysis.description}</p>
                      )}
                      {result.backgroundAnalysis.dominant_colors.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Colors:
                          </span>
                          <div className="flex gap-1">
                            {result.backgroundAnalysis.dominant_colors.map(
                              (color, i) => (
                                <div
                                  key={i}
                                  className="size-5 rounded border"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Layout */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <LayoutGrid className="size-3.5" />
                      Layout
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Style:</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {result.layoutAnalysis.style}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Text overlay:
                        </span>
                        <span>
                          {result.layoutAnalysis.text_overlay_on_image
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      {result.layoutAnalysis.brand_elements.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.layoutAnalysis.brand_elements.map((el, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {el}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* ── Save as Asset Inline Form ────────────────────── */}
            {showSaveForm && status === "completed" && (
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Save className="size-4" />
                  Save as Asset
                </h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Asset name"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={assetDescription}
                    onChange={(e) => setAssetDescription(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveAsAsset}
                    disabled={saving || !assetName.trim()}
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                    )}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSaveForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Actions Bar ──────────────────────────────────────── */}
        {status === "completed" && (
          <div className="flex items-center gap-2 pt-4 border-t -mx-6 px-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveForm(!showSaveForm)}
              disabled={saving}
            >
              <Save className="mr-1.5 size-3.5" />
              Save as Asset
            </Button>

            {onSendToBuilder && (
              <Button size="sm" onClick={handleSendToBuilder}>
                <Wand2 className="mr-1.5 size-3.5" />
                Send to Creative Builder
              </Button>
            )}

            <div className="flex-1" />

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
