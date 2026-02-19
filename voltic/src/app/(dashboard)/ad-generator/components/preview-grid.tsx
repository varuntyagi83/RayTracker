"use client";

import { AdCard } from "./ad-card";
import type { AdPreviewCombination } from "@/types/ads";

interface PreviewGridProps {
  combinations: AdPreviewCombination[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDownload: (id: string) => void;
  disabled?: boolean;
}

export function PreviewGrid({
  combinations,
  onApprove,
  onReject,
  onDownload,
  disabled,
}: PreviewGridProps) {
  const approvedCount = combinations.filter((c) => c.status === "approved").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Preview{" "}
          <span className="text-muted-foreground font-normal">
            ({combinations.length} combinations, {approvedCount} approved)
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {combinations.map((combo) => (
          <AdCard
            key={combo.id}
            combo={combo}
            onApprove={onApprove}
            onReject={onReject}
            onDownload={onDownload}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
