"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics/events";
import {
  fetchBoards,
  createBoardAction,
  updateBoardAction,
  deleteBoardAction,
} from "../actions";
import type { Board } from "@/types/boards";

export default function BoardsClient() {
  const router = useRouter();

  const [boards, setBoards] = useState<Board[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteBoard, setDeleteBoard] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBoards = useCallback(async () => {
    const result = await fetchBoards();
    if (result.data) {
      setBoards(result.data.boards);
      setThumbnails(result.data.thumbnails);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const openCreateDialog = () => {
    setEditingBoard(null);
    setFormName("");
    setFormDescription("");
    setDialogOpen(true);
  };

  const openEditDialog = (board: Board) => {
    setEditingBoard(board);
    setFormName(board.name);
    setFormDescription(board.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    if (editingBoard) {
      const result = await updateBoardAction({
        boardId: editingBoard.id,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });
      if (result.success) {
        track("board_updated", { board_id: editingBoard.id });
        setBoards((prev) =>
          prev.map((b) =>
            b.id === editingBoard.id
              ? { ...b, name: formName.trim(), description: formDescription.trim() || null }
              : b
          )
        );
      }
    } else {
      const result = await createBoardAction({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });
      if (result.success && result.id) {
        track("board_created", { board_id: result.id, name: formName.trim() });
        await loadBoards();
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteBoard) return;
    setDeleting(true);

    const result = await deleteBoardAction({ boardId: deleteBoard.id });
    if (result.success) {
      track("board_deleted", { board_id: deleteBoard.id });
      setBoards((prev) => prev.filter((b) => b.id !== deleteBoard.id));
    }

    setDeleting(false);
    setDeleteBoard(null);
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-sm text-muted-foreground">
            Organize saved ads into collections for creative inspiration.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1.5 size-4" />
          Create Board
        </Button>
      </div>

      {/* Board Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutGrid className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No boards yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first board to start collecting ads.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1.5 size-4" />
            Create Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              thumbnails={thumbnails[board.id] ?? []}
              onClick={() => router.push(`/boards/${board.id}`)}
              onEdit={() => openEditDialog(board)}
              onDelete={() => setDeleteBoard(board)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? "Edit Board" : "Create Board"}
            </DialogTitle>
            <DialogDescription>
              {editingBoard
                ? "Update the board name and description."
                : "Give your board a name to organize saved ads."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Competitor Inspiration"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What's this board for?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? "Saving..." : editingBoard ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteBoard?.name}&rdquo; and
              all {deleteBoard?.adCount ?? 0} saved ads in it. This action cannot
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

// ─── Board Card ──────────────────────────────────────────────────────────────

function BoardCard({
  board,
  thumbnails,
  onClick,
  onEdit,
  onDelete,
}: {
  board: Board;
  thumbnails: string[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Thumbnail Grid */}
        <div className="aspect-[4/3] bg-muted relative">
          {thumbnails.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden">
                  {thumbnails[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnails[i]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="size-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{board.name}</h3>
              {board.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {board.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {board.adCount} {board.adCount === 1 ? "ad" : "ads"}
              </p>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
