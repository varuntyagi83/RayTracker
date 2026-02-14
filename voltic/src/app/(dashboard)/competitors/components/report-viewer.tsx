"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown, Lightbulb, Target, Zap, Users } from "lucide-react";
import type { CompetitorReport, CompetitorAdAnalysis, CrossBrandSummary } from "@/types/competitors";

interface ReportViewerProps {
  report: CompetitorReport;
  onDelete: (reportId: string) => void;
  deleting: boolean;
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
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{score}/10</span>
    </div>
  );
}

function AdAnalysisCard({ analysis }: { analysis: CompetitorAdAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{analysis.brandName}</p>
          {analysis.headline && (
            <p className="font-medium text-sm mt-0.5">{analysis.headline}</p>
          )}
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {analysis.format}
            </Badge>
          </div>
        </div>
      </div>

      {/* Performance Score */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Performance Score</p>
        <ScoreBar score={analysis.performanceScore} />
        <p className="text-xs text-muted-foreground mt-1">{analysis.performanceRationale}</p>
      </div>

      {/* Hook & CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="size-3.5 text-amber-500" />
            <p className="text-xs font-medium">Hook: {analysis.hookType}</p>
          </div>
          <p className="text-xs text-muted-foreground">{analysis.hookExplanation}</p>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="size-3.5 text-blue-500" />
            <p className="text-xs font-medium">CTA: {analysis.ctaType}</p>
          </div>
          <p className="text-xs text-muted-foreground">{analysis.ctaAnalysis}</p>
        </div>
      </div>

      {/* Target Audience */}
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="size-3.5 text-violet-500" />
          <p className="text-xs font-medium">Target Audience</p>
        </div>
        <p className="text-xs mb-1">
          <span className="text-muted-foreground">Primary:</span> {analysis.targetAudience.primary}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {analysis.targetAudience.interests.map((interest, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {interest}
            </Badge>
          ))}
        </div>
        {analysis.targetAudience.painPoints.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Pain Points:</p>
            <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
              {analysis.targetAudience.painPoints.map((point, i) => (
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
            <span className="text-muted-foreground">Framework:</span>{" "}
            {analysis.copyStructure.framework}
          </p>
          <p>
            <span className="text-muted-foreground">Structure:</span>{" "}
            {analysis.copyStructure.structure}
          </p>
          <p>
            <span className="text-muted-foreground">Headline Formula:</span>{" "}
            {analysis.copyStructure.headlineFormula}
          </p>
        </div>
      </div>

      {/* Strengths / Weaknesses / Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="size-3.5 text-emerald-500" />
            <p className="text-xs font-medium">Strengths</p>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            {analysis.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="size-3.5 text-red-500" />
            <p className="text-xs font-medium">Weaknesses</p>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            {analysis.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="size-3.5 text-amber-500" />
            <p className="text-xs font-medium">Improvements</p>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            {analysis.improvements.map((imp, i) => (
              <li key={i}>{imp}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Estimates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Est. Clicks</p>
          <p className="text-sm font-semibold mt-0.5">
            {analysis.estimatedClicksRange.low.toLocaleString()}–
            {analysis.estimatedClicksRange.high.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Est. ROAS</p>
          <p className="text-sm font-semibold mt-0.5">
            {analysis.estimatedROAS.low.toFixed(1)}x–
            {analysis.estimatedROAS.high.toFixed(1)}x
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Target Group</p>
          <p className="text-sm font-semibold mt-0.5">
            {analysis.estimatedTargetGroup}
          </p>
        </div>
      </div>
    </div>
  );
}

function CrossBrandSection({ summary }: { summary: CrossBrandSummary }) {
  return (
    <div className="space-y-4">
      {/* Market Positioning */}
      <div className="rounded-md border p-4">
        <p className="text-sm font-medium mb-2">Market Positioning</p>
        <p className="text-sm text-muted-foreground">{summary.marketPositioning}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Common Patterns */}
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium mb-2">Common Patterns</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {summary.commonPatterns.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        {/* Best Practices */}
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium mb-2">Best Practices</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {summary.bestPractices.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        {/* Gaps & Opportunities */}
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium mb-2">Gaps & Opportunities</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {summary.gapsAndOpportunities.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium mb-2">Recommendations</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {summary.overallRecommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ReportViewer({ report, onDelete, deleting }: ReportViewerProps) {
  return (
    <div className="rounded-lg border">
      {/* Report header */}
      <div className="flex items-start justify-between gap-4 p-4 border-b">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm">{report.title}</h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
            </span>
            <Badge variant="secondary" className="text-xs">
              {report.adCount} ad{report.adCount !== 1 ? "s" : ""} analyzed
            </Badge>
            <Badge variant="outline" className="text-xs">
              {report.creditsUsed} credits
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {report.competitorBrandNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(report.id)}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Cross-brand summary */}
      <div className="p-4 border-b">
        <h5 className="text-sm font-semibold mb-3">Cross-Brand Summary</h5>
        <CrossBrandSection summary={report.crossBrandSummary} />
      </div>

      {/* Per-ad analyses */}
      <div className="p-4">
        <h5 className="text-sm font-semibold mb-3">
          Per-Ad Analysis ({report.perAdAnalyses.length})
        </h5>
        <Accordion type="single" collapsible className="w-full">
          {report.perAdAnalyses.map((analysis, i) => (
            <AccordionItem key={analysis.adId || i} value={`ad-${i}`}>
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2 text-left">
                  <span className="font-medium">{analysis.brandName}</span>
                  <span className="text-muted-foreground truncate max-w-[300px]">
                    {analysis.headline || "Untitled Ad"}
                  </span>
                  <Badge
                    variant={
                      analysis.performanceScore >= 7
                        ? "default"
                        : analysis.performanceScore >= 4
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs ml-auto shrink-0"
                  >
                    {analysis.performanceScore}/10
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <AdAnalysisCard analysis={analysis} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
