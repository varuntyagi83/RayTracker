"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  Scissors,
  Search,
  X,
  Link2,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import DecompositionModal from "@/components/shared/decomposition-modal";
import {
  fetchDecompositionHistory,
  uploadImageAction,
} from "../actions";
import type { DecompositionHistoryItem } from "../actions";

export default function DecompositionPageClient() {
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab
  const [inputMode, setInputMode] = useState<string>("upload");

  // Decomposition modal
  const [decomposeUrl, setDecomposeUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // History
  const [history, setHistory] = useState<DecompositionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load history on mount
  const loadHistory = useCallback(async () => {
    const result = await fetchDecompositionHistory();
    if (result.data) setHistory(result.data);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
    track("decomposition_page_viewed");
  }, [loadHistory]);

  // ─── File handling ──────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Decompose from file upload ──────────────────────────────────

  const handleDecomposeUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("image", selectedFile);

      const result = await uploadImageAction(formData);
      if (!result.success || !result.url) {
        toast.error(result.error || "Failed to upload image");
        setUploading(false);
        return;
      }

      track("decomposition_image_uploaded", { file_name: selectedFile.name });

      setDecomposeUrl(result.url);
      setModalOpen(true);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // ─── Decompose from URL ──────────────────────────────────────────

  const handleDecomposeUrl = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    track("decomposition_modal_opened", {
      source: "decomposition",
      ad_id: "",
    });
    setDecomposeUrl(trimmed);
    setModalOpen(true);
  };

  // ─── View past decomposition ─────────────────────────────────────

  const handleViewHistory = (item: DecompositionHistoryItem) => {
    track("decomposition_modal_opened", {
      source: "decomposition",
      ad_id: item.id,
    });
    setDecomposeUrl(item.sourceImageUrl);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setDecomposeUrl(null);
    // Refresh history in case a new decomposition was created
    loadHistory();
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Decomposition</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload an ad image or paste a URL to extract text, product, and layout
          elements.
        </p>
      </div>

      {/* Upload / URL Section */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={inputMode} onValueChange={setInputMode}>
            <TabsList className="mb-4">
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="size-3.5" />
                Upload Image
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5">
                <Link2 className="size-3.5" />
                Paste URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div className="space-y-4">
                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border bg-muted max-w-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-contain"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 size-7"
                      onClick={clearFile}
                      aria-label="Remove image"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md h-52 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer"
                  >
                    <Upload className="size-8" />
                    <span className="text-sm font-medium">
                      Drag & drop or click to upload
                    </span>
                    <span className="text-xs">
                      JPG, PNG, WebP, GIF up to 5MB
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={handleDecomposeUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Scissors className="mr-1.5 size-4" />
                  )}
                  {uploading ? "Uploading..." : "Decompose"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-4">
                <div className="flex gap-2 max-w-md">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/ad-image.jpg"
                    onKeyDown={(e) => e.key === "Enter" && handleDecomposeUrl()}
                  />
                  <Button
                    onClick={handleDecomposeUrl}
                    disabled={!imageUrl.trim()}
                  >
                    <Scissors className="mr-1.5 size-4" />
                    Decompose
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an ad image. Works with Facebook,
                  Instagram, and other ad platform URLs.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Decompositions</h2>

        {historyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[240px] rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">No decompositions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload an ad image or paste a URL above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onView={() => handleViewHistory(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Decomposition Modal */}
      {decomposeUrl && (
        <DecompositionModal
          open={modalOpen}
          onClose={handleModalClose}
          imageUrl={decomposeUrl}
          sourceType="upload"
        />
      )}
    </div>
  );
}

// ─── History Card ──────────────────────────────────────────────────────────

function HistoryCard({
  item,
  onView,
}: {
  item: DecompositionHistoryItem;
  onView: () => void;
}) {
  const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isCompleted = item.processingStatus === "completed";
  const isFailed = item.processingStatus === "failed";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.sourceImageUrl}
            alt="Ad"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            {isCompleted && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                <CheckCircle2 className="size-3 mr-0.5" />
                Completed
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertCircle className="size-3 mr-0.5" />
                Failed
              </Badge>
            )}
            {!isCompleted && !isFailed && (
              <Badge variant="secondary" className="text-[10px]">
                <Loader2 className="size-3 mr-0.5 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {dateStr}
            {isCompleted && (
              <>
                <span>&middot;</span>
                <span>{item.extractedTextsCount} texts</span>
                {item.productDetected && (
                  <>
                    <span>&middot;</span>
                    <span>Product detected</span>
                  </>
                )}
              </>
            )}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {item.sourceType}
          </Badge>
        </div>

        <div className="border-t px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onView}
          >
            <Search className="mr-1.5 size-3.5" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
