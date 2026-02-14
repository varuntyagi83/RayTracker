"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Layers,
  LayoutGrid,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  fetchBoard,
  removeAdAction,
  updateBoardAction,
  deleteBoardAction,
} from "../actions";
import type { BoardWithAds, SavedAd } from "@/types/boards";

const FORMAT_OPTIONS = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "carousel", label: "Carousel", icon: Layers },
] as const;

export default function BoardDetailClient({ boardId }: { boardId: string }) {
  const router = useRouter();

  const [board, setBoard] = useState<BoardWithAds | null>(null);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState("all");

  // Delete ad
  const [deletingAd, setDeletingAd] = useState<SavedAd | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit board
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete board
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);

  const loadBoard = useCallback(async () => {
    const result = await fetchBoard({ boardId });
    if (result.data) {
      setBoard(result.data);
    }
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const filteredAds = useMemo(() => {
    if (!board) return [];
    if (formatFilter === "all") return board.ads;
    return board.ads.filter((ad) => ad.format === formatFilter);
  }, [board, formatFilter]);

  const handleRemoveAd = async () => {
    if (!deletingAd) return;
    setIsDeleting(true);

    const result = await removeAdAction({ adId: deletingAd.id });
    if (result.success && board) {
      setBoard({
        ...board,
        ads: board.ads.filter((a) => a.id !== deletingAd.id),
        adCount: board.adCount - 1,
      });
    }

    setIsDeleting(false);
    setDeletingAd(null);
  };

  const openEditDialog = () => {
    if (!board) return;
    setEditName(board.name);
    setEditDescription(board.description ?? "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!board || !editName.trim()) return;
    setEditSaving(true);

    const result = await updateBoardAction({
      boardId: board.id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });

    if (result.success) {
      setBoard({
        ...board,
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
    }

    setEditSaving(false);
    setEditOpen(false);
  };

  const handleDeleteBoard = async () => {
    if (!board) return;
    setDeletingBoard(true);

    const result = await deleteBoardAction({ boardId: board.id });
    if (result.success) {
      router.push("/boards");
    }

    setDeletingBoard(false);
    setDeleteBoardOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => router.push("/boards")}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Boards
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <h3 className="text-lg font-semibold">Board not found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This board may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          onClick={() => router.push("/boards")}
        >
          <ArrowLeft className="mr-1 size-4" />
          Boards
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{board.name}</h1>
            {board.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {board.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {board.adCount} {board.adCount === 1 ? "ad" : "ads"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteBoardOpen(true)}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Format Filter */}
      {board.ads.length > 0 && (
        <ToggleGroup
          type="single"
          value={formatFilter}
          onValueChange={(v) => v && setFormatFilter(v)}
          className="justify-start"
        >
          {FORMAT_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value} size="sm">
              <opt.icon className="size-3.5 mr-1" />
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Ads Grid */}
      {filteredAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">
            {board.ads.length === 0 ? "No ads saved yet" : "No matching ads"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {board.ads.length === 0
              ? "Browse the Discover page to find and save ads to this board."
              : "Try changing the format filter."}
          </p>
          {board.ads.length === 0 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/discover")}
            >
              Go to Discover
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <SavedAdCard
              key={ad.id}
              ad={ad}
              onDelete={() => setDeletingAd(ad)}
            />
          ))}
        </div>
      )}

      {/* Delete Ad Confirmation */}
      <AlertDialog
        open={!!deletingAd}
        onOpenChange={(open) => !open && setDeletingAd(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{deletingAd?.brandName ?? "this ad"}&rdquo;
              from the board. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAd}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Board Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Update the board name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editName.trim() || editSaving}
            >
              {editSaving ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Board Confirmation */}
      <AlertDialog
        open={deleteBoardOpen}
        onOpenChange={setDeleteBoardOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{board.name}&rdquo; and all{" "}
              {board.adCount} saved ads in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              disabled={deletingBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBoard ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Saved Ad Card ───────────────────────────────────────────────────────────

function SavedAdCard({
  ad,
  onDelete,
}: {
  ad: SavedAd;
  onDelete: () => void;
}) {
  const formatIcon =
    ad.format === "video" ? Video : ad.format === "carousel" ? Layers : ImageIcon;
  const FormatIcon = formatIcon;

  const dateStr = ad.startDate
    ? new Date(ad.startDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        {/* Header: Brand + Format */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="font-semibold text-sm truncate">
            {ad.brandName ?? "Unknown"}
          </span>
          <Badge variant="secondary" className="text-xs gap-1">
            <FormatIcon className="size-3" />
            {ad.format}
          </Badge>
        </div>

        {/* Thumbnail */}
        <div className="aspect-video bg-muted relative">
          {ad.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.imageUrl}
              alt={ad.brandName ?? "Ad"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          {ad.headline && (
            <p className="text-sm font-medium line-clamp-2">{ad.headline}</p>
          )}
          {ad.body && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {ad.body}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dateStr && <span>{dateStr}</span>}
            {ad.runtimeDays != null && (
              <>
                <span>&middot;</span>
                <span>{ad.runtimeDays}d</span>
              </>
            )}
            {ad.source && (
              <>
                <span>&middot;</span>
                <span className="capitalize">{ad.source}</span>
              </>
            )}
          </div>

          {/* Landing page */}
          {ad.landingPageUrl && (
            <a
              href={ad.landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {new URL(ad.landingPageUrl).hostname}
              <ExternalLink className="inline-block size-3 ml-0.5 -mt-0.5" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="border-t px-4 py-2 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled>
            <Sparkles className="mr-1.5 size-3.5" />
            Variations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
