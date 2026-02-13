"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  METRIC_LABELS,
  AGGREGATION_LABELS,
  PERIOD_LABELS,
  PERIOD_COLORS,
  type PerformanceWizardState,
} from "@/types/automation";

interface WizardPreviewProps {
  state: PerformanceWizardState;
}

export function WizardPreview({ state }: WizardPreviewProps) {
  const { name, config, schedule } = state;

  const sampleEntities = [
    { name: "Summer Sale Campaign", values: { spend: 1250, roas: 3.2, revenue: 4000 } },
    { name: "Brand Awareness Q1", values: { spend: 890, roas: 2.1, revenue: 1869 } },
    { name: "Retargeting Pool", values: { spend: 560, roas: 1.8, revenue: 1008 } },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">
        Live Preview
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        {/* Header */}
        <div className="mb-3">
          <h4 className="font-semibold text-sm">
            {name || "Untitled Automation"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {AGGREGATION_LABELS[config.aggregation]} report •{" "}
            {schedule.frequency === "daily" ? "Daily" : "Weekly"} at{" "}
            {schedule.time} {schedule.timezone}
          </p>
        </div>

        {/* Time periods */}
        <div className="flex gap-1.5 mb-3">
          {config.timePeriods.map((p) => (
            <Badge key={p} variant="secondary" className={`text-xs ${PERIOD_COLORS[p]}`}>
              {PERIOD_LABELS[p]}
            </Badge>
          ))}
        </div>

        {/* Classification groups */}
        {config.classification.enabled && (
          <div className="mb-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                Critical (ROAS ≤ {config.classification.criticalThreshold})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">
                Top (ROAS ≥ {config.classification.topThreshold})
              </span>
            </div>
          </div>
        )}

        {/* Metrics header */}
        <div className="border rounded-md overflow-hidden">
          <div className="grid gap-0 text-xs">
            <div className="grid grid-cols-[1fr_repeat(var(--cols),minmax(0,1fr))] bg-muted/50 px-3 py-2 font-medium"
              style={{ "--cols": config.metrics.length } as React.CSSProperties}
            >
              <span>{AGGREGATION_LABELS[config.aggregation]}</span>
              {config.metrics.map((m) => (
                <span key={m} className="text-right">
                  {METRIC_LABELS[m]}
                </span>
              ))}
            </div>

            {/* Sample rows */}
            {sampleEntities.map((entity, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_repeat(var(--cols),minmax(0,1fr))] px-3 py-2 border-t text-xs"
                style={{ "--cols": config.metrics.length } as React.CSSProperties}
              >
                <span className="truncate font-medium">{entity.name}</span>
                {config.metrics.map((m) => (
                  <span key={m} className="text-right text-muted-foreground">
                    {m === "roas"
                      ? entity.values.roas?.toFixed(1) + "x"
                      : m === "spend" || m === "revenue"
                        ? "$" + (entity.values[m as keyof typeof entity.values] ?? 0).toLocaleString()
                        : "—"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Sort info */}
        <div className="mt-3 text-xs text-muted-foreground">
          Sorted by {METRIC_LABELS[config.sortBy.metric]}{" "}
          ({config.sortBy.direction === "desc" ? "highest first" : "lowest first"}){" "}
          for {PERIOD_LABELS[config.sortBy.period]}
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground/60 text-center">
          Preview with sample data
        </p>
      </Card>
    </div>
  );
}
