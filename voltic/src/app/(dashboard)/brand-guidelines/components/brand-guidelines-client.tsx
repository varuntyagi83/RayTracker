"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { BrandGuidelineWizard } from "./brand-guideline-wizard";
import { BrandGuidelineEditor } from "./brand-guideline-editor";
import { track } from "@/lib/analytics/events";
import {
  fetchBrandGuidelinesListAction,
  fetchBrandGuidelineAction,
  deleteBrandGuidelineAction,
  setDefaultBrandGuidelineAction,
} from "../actions";
import type { BrandGuidelineEntity } from "@/types/brand-guidelines";

type View = "list" | "create" | "edit";

export default function BrandGuidelinesClient() {
  const [view, setView] = useState<View>("list");
  const [guidelines, setGuidelines] = useState<BrandGuidelineEntity[]>([]);
  const [selectedGuideline, setSelectedGuideline] = useState<BrandGuidelineEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BrandGuidelineEntity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGuidelines = useCallback(async () => {
    const result = await fetchBrandGuidelinesListAction();
    if (result.data) setGuidelines(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGuidelines();
  }, [loadGuidelines]);

  const handleEdit = async (id: string) => {
    const result = await fetchBrandGuidelineAction({ id });
    if (result.data) {
      setSelectedGuideline(result.data);
      setView("edit");
    }
  };

  const handleWizardComplete = async (id: string) => {
    await loadGuidelines();
    await handleEdit(id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const result = await deleteBrandGuidelineAction({ id: deleteTarget.id });
    if (result.success) {
      track("brand_guideline_deleted", { guideline_id: deleteTarget.id });
      setGuidelines((prev) => prev.filter((g) => g.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultBrandGuidelineAction({ id });
    await loadGuidelines();
  };

  // ── Create View ───────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="p-8">
        <BrandGuidelineWizard
          onCancel={() => setView("list")}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  // ── Edit View ─────────────────────────────────────────────────────────────
  if (view === "edit" && selectedGuideline) {
    return (
      <div className="p-8">
        <BrandGuidelineEditor
          guideline={selectedGuideline}
          onBack={() => {
            setView("list");
            setSelectedGuideline(null);
            loadGuidelines();
          }}
          onUpdated={async () => {
            const result = await fetchBrandGuidelineAction({ id: selectedGuideline.id });
            if (result.data) setSelectedGuideline(result.data);
          }}
        />
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Guidelines</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage brand guidelines. Reference them with @mentions in Creative Studio.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="mr-1.5 size-4" />
          New Brand Guidelines
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      ) : guidelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No brand guidelines yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first set of brand guidelines to keep AI-generated creatives on-brand.
          </p>
          <Button onClick={() => setView("create")}>
            <Plus className="mr-1.5 size-4" />
            New Brand Guidelines
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {guidelines.map((g) => (
            <GuidelineCard
              key={g.id}
              guideline={g}
              onEdit={() => handleEdit(g.id)}
              onDelete={() => setDeleteTarget(g)}
              onSetDefault={() => handleSetDefault(g.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand guidelines?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;
              and all associated files. This action cannot be undone.
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

// ─── Guideline Card ─────────────────────────────────────────────────────────

function GuidelineCard({
  guideline,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  guideline: BrandGuidelineEntity;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const dateStr = new Date(guideline.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
      onClick={onEdit}
    >
      <CardContent className="p-0">
        {/* Color bar preview */}
        <div className="h-20 bg-muted flex items-center justify-center relative">
          {guideline.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={guideline.logoUrl}
              alt={guideline.name}
              className="h-full w-full object-contain p-3"
            />
          ) : guideline.colorPalette.length > 0 ? (
            <div className="flex w-full h-full">
              {guideline.colorPalette.slice(0, 6).map((c, i) => (
                <div
                  key={i}
                  className="flex-1 h-full"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          ) : (
            <BookOpen className="size-8 text-muted-foreground/30" />
          )}
          {guideline.isDefault && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 text-xs"
            >
              <Star className="size-3 mr-1 fill-current" />
              Default
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{guideline.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{guideline.slug}
              </p>
              {guideline.brandName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {guideline.brandName}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
            </div>

            {/* Actions */}
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
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                {!guideline.isDefault && (
                  <DropdownMenuItem onClick={onSetDefault}>
                    <Star className="size-4" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => window.open(`/api/brand-guidelines/${guideline.id}/pdf`, "_blank")}
                >
                  <Download className="size-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
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
