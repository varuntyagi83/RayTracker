"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Sparkles, Check, X, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAssets } from "@/app/(dashboard)/assets/actions";
import {
  generateVariationsAction,
  fetchVariationsAction,
} from "../../actions";
import {
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
  VARIATION_CREDIT_COST,
} from "@/types/variations";
import type { VariationStrategy, Variation } from "@/types/variations";
import { track } from "@/lib/analytics/events";
import type { SavedAd } from "@/types/boards";
import type { Asset } from "@/types/assets";

const ALL_STRATEGIES: VariationStrategy[] = [
  "hero_product",
  "curiosity",
  "pain_point",
  "proof_point",
  "image_only",
  "text_only",
];

interface VariationModalProps {
  savedAd: SavedAd;
  open: boolean;
  onClose: () => void;
}

export default function VariationModal({
  savedAd,
  open,
  onClose,
}: VariationModalProps) {
  const [step, setStep] = useState<"select" | "generating" | "results">("select");

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetsLoading, setAssetsLoading] = useState(true);

  // Strategies
  const [selectedStrategies, setSelectedStrategies] = useState<Set<VariationStrategy>>(new Set());

  // Generation
  const [generatingStrategy, setGeneratingStrategy] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Results
  const [variations, setVariations] = useState<Variation[]>([]);
  const [existingVariations, setExistingVariations] = useState<Variation[]>([]);

  // Brand guidelines indicator
  const [hasBrandGuidelines, setHasBrandGuidelines] = useState(false);

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    const result = await fetchAssets();
    if (result.data) {
      setAssets(result.data);
    }
    setAssetsLoading(false);
  }, []);

  const loadExistingVariations = useCallback(async () => {
    const result = await fetchVariationsAction({ savedAdId: savedAd.id });
    if (result.data) {
      setExistingVariations(result.data);
    }
  }, [savedAd.id]);

  const checkBrandGuidelines = useCallback(async () => {
    const { fetchBrandGuidelines } = await import(
      "@/app/(dashboard)/settings/actions"
    );
    const result = await fetchBrandGuidelines();
    if (result.data) {
      const g = result.data;
      setHasBrandGuidelines(
        !!(g.brandName || g.brandVoice || g.targetAudience || g.dosAndDonts)
      );
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadAssets();
      loadExistingVariations();
      checkBrandGuidelines();
      setStep("select");
      setSelectedStrategies(new Set());
      setSelectedAssetId("");
      setError("");
      setVariations([]);
    }
  }, [open, loadAssets, loadExistingVariations, checkBrandGuidelines]);

  const toggleStrategy = (strategy: VariationStrategy) => {
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(strategy)) {
        next.delete(strategy);
      } else {
        next.add(strategy);
      }
      return next;
    });
  };

  const totalCost = selectedStrategies.size * VARIATION_CREDIT_COST;

  const handleGenerate = async () => {
    if (!selectedAssetId || selectedStrategies.size === 0) return;

    setStep("generating");
    setError("");

    const strategies = Array.from(selectedStrategies);

    // Show the first strategy as progress indicator
    setGeneratingStrategy(STRATEGY_LABELS[strategies[0]]);

    try {
      const result = await generateVariationsAction({
        savedAdId: savedAd.id,
        assetId: selectedAssetId,
        strategies,
      });

      if (result.error) {
        setError(result.error);
        setStep("select");
        return;
      }

      // Reload variations to show results
      const variationsResult = await fetchVariationsAction({ savedAdId: savedAd.id });
      if (variationsResult.data) {
        setVariations(variationsResult.data);
      }

      const failures = (result.results ?? []).filter((r) => !r.success);
      if (failures.length > 0 && failures.length < strategies.length) {
        setError(`${failures.length} variation(s) failed to generate.`);
      } else if (failures.length === strategies.length) {
        setError("All variations failed to generate.");
      }

      track("board_variation_opened", { ad_id: savedAd.id });
      setStep("results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      setStep("select");
    } finally {
      setGeneratingStrategy("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            AI Variations
          </DialogTitle>
          <DialogDescription>
            Generate ad variations for &ldquo;{savedAd.brandName ?? "this ad"}&rdquo;
            using your product and AI strategies.
          </DialogDescription>
        </DialogHeader>

        {hasBrandGuidelines && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" />
            Brand guidelines will be applied
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 pr-4">
          {step === "select" && (
            <div className="space-y-6 py-2">
              {/* Asset Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Product / Asset
                </label>
                {assetsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading products...
                  </div>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products found. Add products in the Assets page first.
                  </p>
                ) : (
                  <Select
                    value={selectedAssetId}
                    onValueChange={setSelectedAssetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Strategy Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Strategies</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          {selected && (
                            <Check className="size-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {STRATEGY_DESCRIPTIONS[strategy]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Summary */}
              {selectedStrategies.size > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">
                    {selectedStrategies.size} strategy{selectedStrategies.size !== 1 ? "ies" : "y"} selected
                  </span>
                  <Badge variant="secondary">
                    {totalCost} credits
                  </Badge>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedAssetId || selectedStrategies.size === 0}
                className="w-full"
              >
                <Sparkles className="mr-1.5 size-4" />
                Generate Variations ({totalCost} credits)
              </Button>

              {/* Existing Variations */}
              {existingVariations.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-medium">
                    Previous Variations ({existingVariations.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {existingVariations.map((v) => (
                      <VariationCard key={v.id} variation={v} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generating variations...</p>
              {generatingStrategy && (
                <p className="text-xs text-muted-foreground">
                  {generatingStrategy}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This may take a minute
              </p>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-4 py-2">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {variations
                  .filter((v) => v.status === "completed")
                  .map((v) => (
                    <VariationCard key={v.id} variation={v} />
                  ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="w-full"
              >
                Generate More
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Variation Card ──────────────────────────────────────────────────────────

function VariationCard({ variation }: { variation: Variation }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {STRATEGY_LABELS[variation.strategy]}
        </Badge>
        <Badge
          variant={variation.status === "completed" ? "default" : "destructive"}
          className="text-xs"
        >
          {variation.status}
        </Badge>
      </div>

      {variation.generatedImageUrl && (
        <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
          <Image src={variation.generatedImageUrl || "/placeholder.svg"} alt="Generated variation" fill className="h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
        </div>
      )}

      {variation.generatedHeadline && (
        <p className="text-sm font-semibold">{variation.generatedHeadline}</p>
      )}

      {variation.generatedBody && (
        <p className="text-sm text-muted-foreground">{variation.generatedBody}</p>
      )}
    </div>
  );
}
