"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { deleteAdAction } from "../actions";
import type { GeneratedAd } from "@/types/ads";

interface AdsHistoryProps {
  ads: GeneratedAd[];
  onRefresh: () => void;
}

export function AdsHistory({ ads, onRefresh }: AdsHistoryProps) {
  const [deleteTarget, setDeleteTarget] = useState<GeneratedAd | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDownload = (ad: GeneratedAd) => {
    const link = document.createElement("a");
    link.href = `/api/ads/${ad.id}/download`;
    link.download = `ad-${ad.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    track("ad_downloaded", { ad_id: ad.id });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteAdAction({ adId: deleteTarget.id });
    if (result.success) {
      track("ad_deleted", { ad_id: deleteTarget.id });
      toast.success("Ad deleted");
      onRefresh();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Layers className="size-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No saved ads yet.</p>
        <p className="text-xs mt-1">
          Generate and approve ads above to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Saved Ads{" "}
        <span className="text-muted-foreground font-normal">
          ({ads.length})
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="rounded-lg border overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-muted relative">
              <Image
                src={ad.imageUrl}
                alt={ad.textVariant}
                fill
                className="object-cover"
                sizes="300px"
                unoptimized
              />
            </div>
            <div className="p-2.5 space-y-1.5">
              <p className="text-xs font-medium line-clamp-2">
                {ad.textVariant}
              </p>
              {ad.brandGuidelineName && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {ad.brandGuidelineName}
                </Badge>
              )}
              <div className="flex gap-1.5 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleDownload(ad)}
                >
                  <Download className="size-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(ad)}
                  aria-label="Delete ad"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generated ad. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
