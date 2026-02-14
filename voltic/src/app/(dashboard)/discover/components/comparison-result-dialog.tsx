"use client";

import { Trophy, Target, MessageSquare, Users, Lightbulb, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ComparisonResult } from "@/types/discover";

interface ComparisonResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ComparisonResult | null;
}

export function ComparisonResultDialog({
  open,
  onOpenChange,
  result,
}: ComparisonResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Ad Comparison Results
          </DialogTitle>
          <DialogDescription>{result.summary}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Winner Banner */}
            <div className="rounded-lg border-2 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="size-4 text-amber-500" />
                <span className="text-sm font-semibold">
                  Winner: {result.winner.brandName}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {result.winner.rationale}
              </p>
            </div>

            {/* Individual Ad Scores */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Individual Scores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.ads.map((ad, i) => {
                  const isWinner = ad.brandName === result.winner.brandName;
                  const scoreColor =
                    ad.performanceScore >= 7
                      ? "bg-green-500"
                      : ad.performanceScore >= 4
                        ? "bg-amber-500"
                        : "bg-red-500";

                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 space-y-2 ${isWinner ? "ring-2 ring-amber-500/50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {ad.brandName}
                        </span>
                        {isWinner && (
                          <Badge className="bg-amber-500 text-white text-xs">
                            Winner
                          </Badge>
                        )}
                      </div>
                      {/* Score bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${scoreColor}`}
                            style={{
                              width: `${ad.performanceScore * 10}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold">
                          {ad.performanceScore}/10
                        </span>
                      </div>
                      {/* Details */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>Hook:</strong> {ad.hookType}
                        </p>
                        <p>
                          <strong>Framework:</strong> {ad.copyFramework}
                        </p>
                        <p>
                          <strong>Strategy:</strong> {ad.creativeStrategy}
                        </p>
                        <p>
                          <strong>Audience:</strong> {ad.targetAudience}
                        </p>
                      </div>
                      {/* Strengths */}
                      <div className="flex flex-wrap gap-1">
                        {ad.strengths.map((s, j) => (
                          <Badge
                            key={j}
                            variant="secondary"
                            className="text-xs"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                      {/* Weaknesses */}
                      {ad.weaknesses.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ad.weaknesses.map((w, j) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-xs text-red-600 border-red-200"
                            >
                              {w}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparative Insights */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Head-to-Head Analysis
              </h3>
              <div className="space-y-3">
                <InsightRow
                  icon={Target}
                  label="Hook Comparison"
                  text={result.comparativeInsights.hookComparison}
                />
                <InsightRow
                  icon={MessageSquare}
                  label="Copy Comparison"
                  text={result.comparativeInsights.copyComparison}
                />
                <InsightRow
                  icon={Users}
                  label="Audience Overlap"
                  text={result.comparativeInsights.audienceOverlap}
                />
                <InsightRow
                  icon={Lightbulb}
                  label="Creative Strategy"
                  text={
                    result.comparativeInsights.creativeStrategyComparison
                  }
                />
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowUpRight className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Takeaways for Your Ads
                </h3>
              </div>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                {result.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InsightRow({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
