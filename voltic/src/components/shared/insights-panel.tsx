"use client";

import type { AdInsightData } from "@/types/discover";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Lightbulb,
  TrendingUp,
  Users,
  Zap,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";

interface InsightsPanelProps {
  insights: AdInsightData;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const scoreColor =
    insights.performanceScore >= 7
      ? "bg-green-500"
      : insights.performanceScore >= 4
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-3">
      {/* Performance Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Performance Score
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreColor}`}
              style={{ width: `${insights.performanceScore * 10}%` }}
            />
          </div>
          <span className="text-xs font-bold">
            {insights.performanceScore}/10
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {insights.performanceRationale}
      </p>

      {/* Hook Type */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Hook Type
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <Badge variant="secondary" className="text-xs shrink-0">
            {insights.hookType}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {insights.hookExplanation}
          </span>
        </div>
      </div>

      {/* Copy Structure */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Copy Structure
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {insights.copyStructure.headlineFormula}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {insights.copyStructure.bodyFramework}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {insights.copyStructure.ctaType}
          </Badge>
        </div>
      </div>

      {/* Creative Strategy */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Creative Strategy
          </span>
        </div>
        <p className="text-xs">{insights.creativeStrategy}</p>
      </div>

      {/* Target Audience */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Target Audience
          </span>
        </div>
        <p className="text-xs font-medium mb-1">
          {insights.targetAudience.primary}
        </p>
        <div className="flex flex-wrap gap-1">
          {insights.targetAudience.interests.map((interest, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {interest}
            </Badge>
          ))}
        </div>
        {insights.targetAudience.painPoints.length > 0 && (
          <ul className="text-xs mt-1 space-y-0.5 list-disc list-inside text-muted-foreground">
            {insights.targetAudience.painPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Strengths */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Why It Works
          </span>
        </div>
        <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
          {insights.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {/* Improvements */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Improvements
          </span>
        </div>
        <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
          {insights.improvements.map((imp, i) => (
            <li key={i}>{imp}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
