"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Layers, Wand2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { GuidelineSelector } from "./guideline-selector";
import { BackgroundSelector } from "./background-selector";
import { TextVariantsForm } from "./text-variants-form";
import { StylingControls } from "./styling-controls";
import { PreviewGrid } from "./preview-grid";
import { AdsHistory } from "./ads-history";
import {
  fetchGuidelinesForAdGenAction,
  fetchAssetsForGuidelineAdGenAction,
  fetchGeneratedAdsAction,
  saveApprovedAdsAction,
} from "../actions";
import type { AdPreviewCombination, TextPosition, GeneratedAd } from "@/types/ads";

export default function AdGeneratorClient() {
  // ── Step 1: Guideline ──
  const [guidelines, setGuidelines] = useState<{ id: string; name: string }[]>([]);
  const [selectedGuidelineId, setSelectedGuidelineId] = useState("");
  const [loadingGuidelines, setLoadingGuidelines] = useState(true);

  // ── Step 2: Backgrounds ──
  const [backgroundAssets, setBackgroundAssets] = useState<
    { id: string; name: string; imageUrl: string }[]
  >([]);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // ── Step 3: Texts ──
  const [textVariants, setTextVariants] = useState<string[]>([""]);

  // ── Step 4: Styling ──
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textPosition, setTextPosition] = useState<TextPosition>({ type: "center" });

  // ── Step 5: Previews ──
  const [combinations, setCombinations] = useState<AdPreviewCombination[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── History ──
  const [savedAds, setSavedAds] = useState<GeneratedAd[]>([]);

  // ── Load guidelines on mount ──
  useEffect(() => {
    fetchGuidelinesForAdGenAction().then((result) => {
      if (result.data) setGuidelines(result.data);
      setLoadingGuidelines(false);
    });
    loadSavedAds();
  }, []);

  // ── Load assets when guideline changes ──
  useEffect(() => {
    if (!selectedGuidelineId) {
      setBackgroundAssets([]);
      setSelectedBackgrounds([]);
      return;
    }

    setLoadingAssets(true);
    fetchAssetsForGuidelineAdGenAction({ guidelineId: selectedGuidelineId })
      .then((result) => {
        if (result.data) setBackgroundAssets(result.data);
        setSelectedBackgrounds([]);
      })
      .finally(() => setLoadingAssets(false));
  }, [selectedGuidelineId]);

  const loadSavedAds = useCallback(async () => {
    const result = await fetchGeneratedAdsAction();
    if (result.data) setSavedAds(result.data);
  }, []);

  // ── Generate previews ──
  const canGenerate =
    selectedGuidelineId &&
    selectedBackgrounds.length > 0 &&
    textVariants.some((t) => t.trim().length > 0);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);

    const validTexts = textVariants.filter((t) => t.trim().length > 0);
    const combos: AdPreviewCombination[] = [];
    const apiCombinations: Array<{
      combinationId: string;
      backgroundImageUrl: string;
      text: string;
      fontFamily: string;
      fontSize: number;
      textColor: string;
      textPosition: TextPosition;
    }> = [];

    // Build M×N matrix
    for (const bgId of selectedBackgrounds) {
      const bg = backgroundAssets.find((a) => a.id === bgId);
      if (!bg) continue;

      for (const text of validTexts) {
        const id = `${bgId}-${Math.random().toString(36).slice(2, 8)}`;
        combos.push({
          id,
          backgroundAssetId: bgId,
          backgroundImageUrl: bg.imageUrl,
          backgroundAssetName: bg.name,
          textVariant: text.trim(),
          fontFamily,
          fontSize,
          textColor,
          textPosition,
          status: "pending",
        });
        apiCombinations.push({
          combinationId: id,
          backgroundImageUrl: bg.imageUrl,
          text: text.trim(),
          fontFamily,
          fontSize,
          textColor,
          textPosition,
        });
      }
    }

    setCombinations(combos);

    try {
      const response = await fetch("/api/ads/composite-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combinations: apiCombinations }),
      });

      if (!response.ok) throw new Error("Batch composite failed");

      const { results, errors } = await response.json();

      // Update combos with results
      setCombinations((prev) =>
        prev.map((combo) => {
          const result = results.find(
            (r: { combinationId: string }) => r.combinationId === combo.id
          );
          if (result) {
            return {
              ...combo,
              previewImageUrl: result.imageUrl,
              storagePath: result.storagePath,
              width: result.width,
              height: result.height,
              status: "approved" as const,
            };
          }
          const err = errors?.find(
            (e: { combinationId: string }) => e.combinationId === combo.id
          );
          if (err) {
            return { ...combo, status: "rejected" as const };
          }
          return combo;
        })
      );

      track("ad_previews_generated", {
        guideline_id: selectedGuidelineId,
        text_count: validTexts.length,
        background_count: selectedBackgrounds.length,
        total: combos.length,
      });

      toast.success(`Generated ${results.length} ad previews`);
      if (errors?.length > 0) {
        toast.error(`${errors.length} combinations failed`);
      }
    } catch (err) {
      console.error("Generate error:", err);
      toast.error("Failed to generate previews");
    } finally {
      setGenerating(false);
    }
  };

  // ── Approve / Reject ──
  const handleApprove = (id: string) => {
    setCombinations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c))
    );
  };

  const handleReject = (id: string) => {
    setCombinations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" as const } : c))
    );
  };

  const handleDownloadPreview = (id: string) => {
    const combo = combinations.find((c) => c.id === id);
    if (!combo?.previewImageUrl) return;
    const link = document.createElement("a");
    link.href = combo.previewImageUrl;
    link.download = `preview-${id.slice(0, 8)}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Save approved ──
  const handleSaveApproved = async () => {
    const approved = combinations.filter(
      (c) => c.status === "approved" && c.previewImageUrl && c.storagePath
    );
    if (approved.length === 0) {
      toast.error("No approved ads to save");
      return;
    }

    setSaving(true);
    const result = await saveApprovedAdsAction({
      ads: approved.map((c) => ({
        brandGuidelineId: selectedGuidelineId,
        backgroundAssetId: c.backgroundAssetId,
        textVariant: c.textVariant,
        fontFamily: c.fontFamily,
        fontSize: c.fontSize,
        textColor: c.textColor,
        textPosition: c.textPosition,
        imageUrl: c.previewImageUrl!,
        storagePath: c.storagePath!,
        width: c.width,
        height: c.height,
      })),
    });

    if (result.success) {
      track("ads_saved_batch", {
        count: approved.length,
        guideline_id: selectedGuidelineId,
      });
      toast.success(`Saved ${approved.length} ads`);
      setCombinations([]);
      await loadSavedAds();
    } else {
      toast.error(result.error ?? "Failed to save");
    }
    setSaving(false);
  };

  // ── Loading state ──
  if (loadingGuidelines) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="size-6" />
          Ad Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose text on background images to generate ad creatives at scale.
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Selection */}
        <div className="space-y-5">
          <GuidelineSelector
            guidelines={guidelines}
            value={selectedGuidelineId}
            onChange={setSelectedGuidelineId}
            disabled={generating}
          />

          {selectedGuidelineId && (
            <>
              {loadingAssets ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="size-4 animate-spin" />
                  Loading backgrounds...
                </div>
              ) : (
                <BackgroundSelector
                  assets={backgroundAssets}
                  selected={selectedBackgrounds}
                  onChange={setSelectedBackgrounds}
                  disabled={generating}
                  guidelineId={selectedGuidelineId}
                  onAssetsChanged={() => {
                    setLoadingAssets(true);
                    fetchAssetsForGuidelineAdGenAction({ guidelineId: selectedGuidelineId })
                      .then((result) => {
                        if (result.data) setBackgroundAssets(result.data);
                      })
                      .finally(() => setLoadingAssets(false));
                  }}
                />
              )}
            </>
          )}

          <TextVariantsForm
            texts={textVariants}
            onChange={setTextVariants}
            disabled={generating}
          />
        </div>

        {/* Right column: Styling + Actions */}
        <div className="space-y-5">
          <StylingControls
            fontFamily={fontFamily}
            fontSize={fontSize}
            textColor={textColor}
            textPosition={textPosition}
            onFontFamilyChange={setFontFamily}
            onFontSizeChange={setFontSize}
            onTextColorChange={setTextColor}
            onTextPositionChange={setTextPosition}
            disabled={generating}
          />

          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating {selectedBackgrounds.length * textVariants.filter((t) => t.trim()).length} previews...
                </>
              ) : (
                <>
                  <Wand2 className="size-4 mr-2" />
                  Generate Previews
                  {canGenerate && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({selectedBackgrounds.length * textVariants.filter((t) => t.trim()).length})
                    </span>
                  )}
                </>
              )}
            </Button>

            {combinations.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleSaveApproved}
                disabled={
                  saving ||
                  combinations.filter((c) => c.status === "approved").length === 0
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Approved ({combinations.filter((c) => c.status === "approved").length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Grid */}
      {combinations.length > 0 && (
        <>
          <Separator />
          <PreviewGrid
            combinations={combinations}
            onApprove={handleApprove}
            onReject={handleReject}
            onDownload={handleDownloadPreview}
            disabled={generating || saving}
          />
        </>
      )}

      {/* Saved Ads History */}
      <Separator />
      <AdsHistory ads={savedAds} onRefresh={loadSavedAds} />
    </div>
  );
}
