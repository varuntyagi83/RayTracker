"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Loader2,
  Zap,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  Brain,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { track } from "@/lib/analytics/events";
import { analyzeAdAction } from "../../actions";
import type { SavedAd } from "@/types/boards";
import type { AdInsightData } from "@/types/discover";

interface AnalyzeModalProps {
  savedAd: SavedAd;
  open: boolean;
  onClose: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-500"
      : score >= 6
        ? "bg-blue-500"
        : score >= 4
          ? "bg-yellow-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-sm font-bold w-10 text-right">{score}/10</span>
    </div>
  );
}

export default function AnalyzeModal({
  savedAd,
  open,
  onClose,
}: AnalyzeModalProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AdInsightData | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await analyzeAdAction({ savedAdId: savedAd.id });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setInsights(result.data);
      setCached(result.cached ?? false);
      track("board_ad_analyzed", { ad_id: savedAd.id, cached: result.cached ?? false });
    }

    setLoading(false);
  }, [savedAd.id]);

  useEffect(() => {
    if (open && !insights && !loading) {
      analyze();
    }
  }, [open, insights, loading, analyze]);

  // Reset on close
  const handleClose = () => {
    setInsights(null);
    setCached(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="size-5 text-violet-500" />
            Ad Analysis
            {cached && (
              <Badge variant="secondary" className="text-xs ml-2">
                Cached
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Ad Summary */}
        <div className="flex items-start gap-3 rounded-md border p-3">
          {savedAd.imageUrl && (            <Image src={savedAd.imageUrl || "/placeholder.svg"} alt={savedAd.brandName ?? "Ad"} width={64} height={64} className="rounded object-cover shrink-0" unoptimized />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              {savedAd.brandName ?? "Unknown Brand"}
            </p>
            {savedAd.headline && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {savedAd.headline}
              </p>
            )}
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {savedAd.format}
              </Badge>
              {savedAd.runtimeDays != null && (
                <Badge variant="outline" className="text-xs">
                  {savedAd.runtimeDays}d running
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-8 text-violet-500 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Analyzing ad with AI...
            </p>
            <p className="text-xs text-muted-foreground">
              This typically takes 3-5 seconds
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={analyze}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Results */}
        {insights && !loading && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-2">
              {/* Performance Score */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Performance Score
                </p>
                <ScoreBar score={insights.performanceScore} />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {insights.performanceRationale}
                </p>
              </div>

              {/* Hook & CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="size-3.5 text-amber-500" />
                    <p className="text-xs font-medium">
                      Hook: {insights.hookType}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insights.hookExplanation}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="size-3.5 text-blue-500" />
                    <p className="text-xs font-medium">
                      CTA: {insights.copyStructure.ctaType}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strategy: {insights.creativeStrategy}
                  </p>
                </div>
              </div>

              {/* Target Audience */}
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="size-3.5 text-violet-500" />
                  <p className="text-xs font-medium">Target Audience</p>
                </div>
                <p className="text-xs mb-1.5">
                  <span className="text-muted-foreground">Primary:</span>{" "}
                  {insights.targetAudience.primary}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {insights.targetAudience.interests.map((interest, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
                {insights.targetAudience.painPoints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Pain Points:
                    </p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                      {insights.targetAudience.painPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Copy Structure */}
              <div className="rounded-md border p-3">
                <p className="text-xs font-medium mb-2">Copy Structure</p>
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">
                      Headline Formula:
                    </span>{" "}
                    {insights.copyStructure.headlineFormula}
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Body Framework:
                    </span>{" "}
                    {insights.copyStructure.bodyFramework}
                  </p>
                  <p>
                    <span className="text-muted-foreground">CTA Type:</span>{" "}
                    {insights.copyStructure.ctaType}
                  </p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="size-3.5 text-emerald-500" />
                    <p className="text-xs font-medium">Strengths</p>
                  </div>
                  <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                    {insights.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="size-3.5 text-amber-500" />
                    <p className="text-xs font-medium">Improvements</p>
                  </div>
                  <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                    {insights.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
