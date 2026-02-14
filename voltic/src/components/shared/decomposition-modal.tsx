"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Scissors,
  Save,
  Wand2,
  ChevronDown,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { useDecomposition } from "@/hooks/use-decomposition";
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
  headline: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  subheadline: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  body: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cta: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  legal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  brand: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

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

  // Editable texts (local copy for editing)
  const [editedTexts, setEditedTexts] = useState<ExtractedText[]>([]);

  // Save as Asset
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Analysis collapsible
  const [analysisOpen, setAnalysisOpen] = useState(false);

  // Start decomposition when modal opens
  useEffect(() => {
    if (open && imageUrl) {
      reset();
      setSaved(false);
      setAnalysisOpen(false);
      decompose(imageUrl, sourceType, sourceId);
    }
  }, [open, imageUrl, sourceType, sourceId, decompose, reset]);

  // Populate editable texts when result arrives
  useEffect(() => {
    if (result?.extractedTexts) {
      setEditedTexts([...result.extractedTexts]);
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

  const handleSaveAsAsset = useCallback(async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const assetResult = await saveAsAsset();
      track("decomposition_asset_saved", {
        decomposition_id: result?.id ?? "",
        asset_id: assetResult.asset_id,
      });
      toast.success("Saved as asset", { description: assetResult.name });
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [saveAsAsset, result, saving, saved]);

  const handleSendToBuilder = useCallback(async () => {
    if (!onSendToBuilder || !result) return;

    try {
      const texts = await getTextsForBuilder();
      const cleanUrl = result.cleanImageUrl ?? imageUrl;
      const images: CreativeImage[] = [
        { id: `decompose-${result.id}`, url: cleanUrl, name: "Decomposed product image" },
      ];

      const headlines = texts.filter((t) => t.role === "headline");
      const bodies = texts.filter((t) => t.role === "body");
      const creativeTexts: CreativeText[] = [];
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

  const cleanImageSrc = result?.cleanImageUrl || imageUrl;
  const isLoading = status === "analyzing" || status === "generating";
  const isDone = status === "completed";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="size-5" />
            Ad Decomposition
          </DialogTitle>
          <DialogDescription>
            Extract text, product, and layout elements from the ad image.
            {" "}
            <Badge variant="secondary" className="text-xs">10 credits</Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-5 pt-4">

            {/* ── Status Bar ─────────────────────────────────────── */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                <Loader2 className="size-4 animate-spin" />
                {status === "analyzing"
                  ? "Analyzing ad with GPT-4o Vision..."
                  : "Generating clean product image..."}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* ── Images — side by side ──────────────────────────── */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Images</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Original */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Original Ad</p>
                  <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Original ad"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Clean */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Clean Product Image</p>
                  <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cleanImageSrc}
                      alt="Clean product"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {isDone && !result?.cleanImageUrl && (
                      <div className="absolute bottom-1.5 inset-x-1.5 text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          No overlay text — original used
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Extracted Texts ────────────────────────────────── */}
            {isDone && editedTexts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Extracted Texts</h3>

                {marketingTexts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Marketing overlay text — editable
                    </p>
                    {marketingTexts.map((text, i) => {
                      const globalIndex = editedTexts.findIndex((t) => t === text);
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg border bg-card"
                        >
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Badge className={`text-[10px] px-1.5 py-0 ${TEXT_TYPE_COLORS[text.type] ?? ""}`}>
                              {text.type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {text.position}
                            </Badge>
                          </div>
                          <Input
                            value={text.content}
                            onChange={(e) => handleTextEdit(globalIndex >= 0 ? globalIndex : i, e.target.value)}
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
                        <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${TEXT_TYPE_COLORS.brand}`}>
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

            {/* ── Analysis (Collapsible) ────────────────────────── */}
            {isDone && result && (
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors w-full">
                  {analysisOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  Detailed Analysis
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Product */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Package className="size-3.5" /> Product
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Detected:</span>
                        <Badge variant={result.productAnalysis.detected ? "default" : "secondary"} className="text-[10px]">
                          {result.productAnalysis.detected ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {result.productAnalysis.description && <p>{result.productAnalysis.description}</p>}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Position: {result.productAnalysis.position}</span>
                        <span>Area: {result.productAnalysis.occupies_percent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Background */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Palette className="size-3.5" /> Background
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="secondary" className="text-[10px]">{result.backgroundAnalysis.type}</Badge>
                      </div>
                      {result.backgroundAnalysis.description && <p>{result.backgroundAnalysis.description}</p>}
                      {result.backgroundAnalysis.dominant_colors.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Colors:</span>
                          <div className="flex gap-1">
                            {result.backgroundAnalysis.dominant_colors.map((color, i) => (
                              <div key={i} className="size-5 rounded border" style={{ backgroundColor: color }} title={color} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Layout */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <LayoutGrid className="size-3.5" /> Layout
                    </div>
                    <div className="p-3 rounded-lg border bg-card text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Style:</span>
                        <Badge variant="secondary" className="text-[10px]">{result.layoutAnalysis.style}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Text overlay:</span>
                        <span>{result.layoutAnalysis.text_overlay_on_image ? "Yes" : "No"}</span>
                      </div>
                      {result.layoutAnalysis.brand_elements.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.layoutAnalysis.brand_elements.map((el, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{el}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Save confirmation */}
            {saved && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
                <CheckCircle2 className="size-4 shrink-0" />
                Saved as asset. View it on the Assets page.
              </div>
            )}
          </div>
        </div>

        {/* ── Actions Bar — always visible at bottom ──────────── */}
        <div className="flex items-center gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsAsset}
            disabled={saving || saved || !isDone}
          >
            {saving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="mr-1.5 size-3.5" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {saving ? "Saving..." : saved ? "Saved" : "Save as Asset"}
          </Button>

          {onSendToBuilder && (
            <Button size="sm" onClick={handleSendToBuilder} disabled={!isDone}>
              <Wand2 className="mr-1.5 size-3.5" />
              Send to Creative Builder
            </Button>
          )}

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
