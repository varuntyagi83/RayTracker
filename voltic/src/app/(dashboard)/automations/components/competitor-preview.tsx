"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, Play, Image as ImageIcon } from "lucide-react";
import {
  IMPRESSION_PERIOD_LABELS,
  STARTED_WITHIN_LABELS,
  type CompetitorWizardState,
} from "@/types/automation";

interface CompetitorPreviewProps {
  state: CompetitorWizardState;
}

const MOCK_ADS = [
  {
    id: 1,
    headline: "Summer Collection — 50% Off Everything",
    runtime: "14 days",
    format: "Video",
    status: "Active",
  },
  {
    id: 2,
    headline: "New Arrivals: Fall 2026 Lookbook",
    runtime: "7 days",
    format: "Carousel",
    status: "Active",
  },
  {
    id: 3,
    headline: "Free Shipping on Orders $50+",
    runtime: "21 days",
    format: "Image",
    status: "Active",
  },
  {
    id: 4,
    headline: "Limited Time: Buy 2 Get 1 Free",
    runtime: "3 days",
    format: "Video",
    status: "Active",
  },
];

export function CompetitorPreview({ state }: CompetitorPreviewProps) {
  const { name, config } = state;
  const brandName = config.brandName || "Competitor Brand";
  const visibleAds = MOCK_ADS.slice(0, Math.min(config.scrapeSettings.topN, MOCK_ADS.length));

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">
        Live Preview
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        {/* Header */}
        <div className="mb-3">
          <h4 className="font-semibold text-sm">
            {name || "Untitled Competitor Monitor"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tracking <span className="font-medium">{brandName}</span> • Top{" "}
            {config.scrapeSettings.topN} ads
          </p>
        </div>

        {/* Settings badges */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
            {IMPRESSION_PERIOD_LABELS[config.scrapeSettings.impressionPeriod]}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            Started {STARTED_WITHIN_LABELS[config.scrapeSettings.startedWithin]}
          </Badge>
        </div>

        {/* Mock ad list */}
        <div className="border rounded-md overflow-hidden">
          {visibleAds.map((ad, i) => (
            <div
              key={ad.id}
              className={`flex items-start gap-3 px-3 py-2.5 text-xs ${
                i > 0 ? "border-t" : ""
              }`}
            >
              {/* Thumbnail placeholder */}
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                {ad.format === "Video" ? (
                  <Play className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono">
                    #{i + 1}
                  </span>
                  <span className="font-medium truncate">{ad.headline}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                  <span>{ad.runtime}</span>
                  <span>•</span>
                  <span>{ad.format}</span>
                </div>
              </div>

              <button className="text-blue-600 hover:text-blue-700 shrink-0 mt-0.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground/60 text-center">
          Preview with sample data
        </p>
      </Card>
    </div>
  );
}
