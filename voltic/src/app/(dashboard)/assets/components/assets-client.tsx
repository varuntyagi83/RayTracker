"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Package,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  fetchAssets,
  createAssetAction,
  updateAssetAction,
  deleteAssetAction,
} from "../actions";
import type { Asset } from "@/types/assets";

export default function AssetsClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAssets = useCallback(async (query?: string) => {
    const result = await fetchAssets(query);
    if (result.data) setAssets(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAssets(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadAssets]);

  const openCreateDialog = () => {
    setEditingAsset(null);
    setFormName("");
    setFormDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormDescription(asset.description ?? "");
    setSelectedFile(null);
    setPreviewUrl(asset.imageUrl);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image must be under 5MB");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setFormError("Only JPG, PNG, WebP, and GIF images are allowed");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFormError(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(editingAsset?.imageUrl ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!editingAsset && !selectedFile) {
      setFormError("Image is required");
      return;
    }

    setSaving(true);
    setFormError(null);

    const formData = new FormData();
    formData.set("name", formName.trim());
    formData.set("description", formDescription.trim());

    if (editingAsset) {
      formData.set("assetId", editingAsset.id);
      if (selectedFile) formData.set("image", selectedFile);

      const result = await updateAssetAction(formData);
      if (!result.success) {
        setFormError(result.error ?? "Failed to update");
        setSaving(false);
        return;
      }
    } else {
      formData.set("image", selectedFile!);

      const result = await createAssetAction(formData);
      if (!result.success) {
        setFormError(result.error ?? "Failed to create");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    await loadAssets(search || undefined);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const result = await deleteAssetAction({ assetId: deleteTarget.id });
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Your product catalog for AI creative variations.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1.5 size-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-lg" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">
            {search ? "No products found" : "No products yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search
              ? "Try a different search term."
              : "Add your first product to start generating creative variations."}
          </p>
          {!search && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-1.5 size-4" />
              Add Product
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={() => openEditDialog(asset)}
              onDelete={() => setDeleteTarget(asset)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingAsset
                ? "Update the product details."
                : "Add a product from your catalog. The image will be used for AI variations."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Image</label>
              {previewUrl ? (
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-contain"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 size-7"
                    onClick={clearFile}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  <Upload className="size-8" />
                  <span className="text-sm">Click to upload image</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF up to 5MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-1.5 size-3.5" />
                  Change Image
                </Button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Summer Hoodie"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief product description for AI context..."
                rows={3}
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? editingAsset
                  ? "Updating..."
                  : "Creating..."
                : editingAsset
                  ? "Update"
                  : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;
              and its image. Any variations using this product will also be
              removed. This action cannot be undone.
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

// ─── Asset Card ──────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateStr = new Date(asset.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        {/* Image */}
        <div className="aspect-square bg-muted relative">
          {asset.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.imageUrl}
              alt={asset.name}
              className="h-full w-full object-contain"
            />
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
              <h3 className="font-semibold text-sm truncate">{asset.name}</h3>
              {asset.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {asset.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Added {dateStr}
              </p>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" />
                  Edit
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
