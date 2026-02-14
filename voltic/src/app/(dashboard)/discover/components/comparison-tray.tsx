"use client";

import { X, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useComparisonStore } from "@/lib/stores/comparison-store";

interface ComparisonTrayProps {
  onCompare: () => void;
  isComparing: boolean;
}

export function ComparisonTray({ onCompare, isComparing }: ComparisonTrayProps) {
  const { selectedAds, removeAd, clearAll } = useComparisonStore();

  if (selectedAds.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
      <div className="mx-auto max-w-screen-xl px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Label */}
          <div className="flex items-center gap-2 shrink-0">
            <Scale className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Compare</span>
            <Badge variant="secondary">{selectedAds.length}/4</Badge>
          </div>

          {/* Selected Ad Thumbnails */}
          <div className="flex items-center gap-2 overflow-x-auto flex-1">
            {selectedAds.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 shrink-0 group"
              >
                {ad.mediaThumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ad.mediaThumbnailUrl}
                    alt={ad.pageName}
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <div className="size-8 rounded bg-muted-foreground/20 flex items-center justify-center text-xs">
                    Ad
                  </div>
                )}
                <span className="text-xs font-medium max-w-[80px] truncate">
                  {ad.pageName}
                </span>
                <button
                  onClick={() => removeAd(ad.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="size-3.5 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={onCompare}
              disabled={selectedAds.length < 2 || isComparing}
            >
              {isComparing ? (
                <>
                  <div className="mr-1.5 h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Scale className="size-3.5 mr-1" />
                  Compare ({selectedAds.length}) - 3cr
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
