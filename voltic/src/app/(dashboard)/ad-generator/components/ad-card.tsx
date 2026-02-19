"use client";

import Image from "next/image";
import { Check, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdPreviewCombination } from "@/types/ads";

interface AdCardProps {
  combo: AdPreviewCombination;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDownload: (id: string) => void;
  disabled?: boolean;
}

export function AdCard({
  combo,
  onApprove,
  onReject,
  onDownload,
  disabled,
}: AdCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden transition-all",
        combo.status === "approved" && "ring-2 ring-green-500/50 border-green-500",
        combo.status === "rejected" && "opacity-50 border-destructive"
      )}
    >
      {/* Image */}
      <div className="aspect-square bg-muted relative">
        {combo.previewImageUrl ? (
          <Image
            src={combo.previewImageUrl}
            alt={combo.textVariant}
            fill
            className="object-cover"
            sizes="300px"
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            Generating...
          </div>
        )}
      </div>

      {/* Info & Actions */}
      <div className="p-2.5 space-y-2">
        <p className="text-xs font-medium line-clamp-2">{combo.textVariant}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {combo.backgroundAssetName}
        </p>

        <div className="flex gap-1.5">
          <Button
            variant={combo.status === "approved" ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onApprove(combo.id)}
            disabled={disabled}
          >
            <Check className="size-3 mr-1" />
            Approve
          </Button>
          <Button
            variant={combo.status === "rejected" ? "destructive" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onReject(combo.id)}
            disabled={disabled}
          >
            <X className="size-3 mr-1" />
            Reject
          </Button>
          {combo.previewImageUrl && (
            <Button
              variant="outline"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onDownload(combo.id)}
              disabled={disabled}
              title="Download"
            >
              <Download className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
