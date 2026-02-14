"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Wand2,
  ImageIcon,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { enhanceCreativesAction } from "../../actions";
import { CREATIVE_ENHANCE_CREDIT_COST } from "@/types/variations";
import type { CreativeImage, CreativeText, CreativeCombination } from "@/types/variations";

interface CreativeBuilderModalProps {
  open: boolean;
  onClose: () => void;
  initialImages?: CreativeImage[];
  initialTexts?: CreativeText[];
}

let nextImageId = 1;
let nextTextId = 1;

export default function CreativeBuilderModal({
  open,
  onClose,
  initialImages,
  initialTexts,
}: CreativeBuilderModalProps) {
  const [images, setImages] = useState<CreativeImage[]>([]);
  const [texts, setTexts] = useState<CreativeText[]>([]);
  const [mode, setMode] = useState<"manual" | "ai_enhanced">("manual");
  const [enhancing, setEnhancing] = useState(false);
  const [enhanced, setEnhanced] = useState<Record<string, { headline: string; body: string }>>({});
  const [error, setError] = useState("");
  const [hasBrandGuidelines, setHasBrandGuidelines] = useState(false);

  // New text form
  const [newHeadline, setNewHeadline] = useState("");
  const [newBody, setNewBody] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkBrandGuidelines = useCallback(async () => {
    const { fetchBrandGuidelines } = await import(
      "@/app/(dashboard)/settings/actions"
    );
    const result = await fetchBrandGuidelines();
    if (result.data) {
      const g = result.data;
      setHasBrandGuidelines(
        !!(g.brandName || g.brandVoice || g.targetAudience || g.dosAndDonts)
      );
    }
  }, []);

  useEffect(() => {
    if (open) {
      setMode("manual");
      setEnhanced({});
      setError("");
      setNewHeadline("");
      setNewBody("");
      nextImageId = 1;
      nextTextId = 1;

      // Pre-populate from decomposition if provided
      if (initialImages && initialImages.length > 0) {
        setImages(initialImages);
        nextImageId = initialImages.length + 1;
      } else {
        setImages([]);
      }
      if (initialTexts && initialTexts.length > 0) {
        setTexts(initialTexts);
        nextTextId = initialTexts.length + 1;
      } else {
        setTexts([]);
      }

      checkBrandGuidelines();
    }
  }, [open, checkBrandGuidelines, initialImages, initialTexts]);

  // Image handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: CreativeImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `img-${nextImageId++}`,
        url,
        name: file.name,
      });
    }
    setImages((prev) => [...prev, ...newImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((img) => img.id !== id);
    });
  };

  // Text handlers
  const addText = () => {
    if (!newHeadline.trim() || !newBody.trim()) return;
    setTexts((prev) => [
      ...prev,
      {
        id: `txt-${nextTextId++}`,
        headline: newHeadline.trim(),
        body: newBody.trim(),
      },
    ]);
    setNewHeadline("");
    setNewBody("");
  };

  const removeText = (id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  // Build combinations
  const combinations: CreativeCombination[] = [];
  if (images.length > 0 && texts.length > 0) {
    for (const image of images) {
      for (const text of texts) {
        const comboId = `${image.id}_${text.id}`;
        combinations.push({
          id: comboId,
          image,
          text,
          enhancedHeadline: enhanced[comboId]?.headline,
          enhancedBody: enhanced[comboId]?.body,
        });
      }
    }
  }

  const totalEnhanceCost = combinations.length * CREATIVE_ENHANCE_CREDIT_COST;

  const handleEnhance = async () => {
    if (combinations.length === 0) return;
    setEnhancing(true);
    setError("");

    const result = await enhanceCreativesAction({
      combinations: combinations.map((c) => ({
        headline: c.text.headline,
        body: c.text.body,
      })),
    });

    if (result.error) {
      setError(result.error);
      setEnhancing(false);
      return;
    }

    if (result.results) {
      const newEnhanced: Record<string, { headline: string; body: string }> = {};
      combinations.forEach((combo, i) => {
        if (result.results![i]) {
          newEnhanced[combo.id] = result.results![i];
        }
      });
      setEnhanced(newEnhanced);
    }

    setEnhancing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5" />
            Creative Builder
          </DialogTitle>
          <DialogDescription>
            Upload images and add text to create N&times;M creative combinations.
          </DialogDescription>
        </DialogHeader>

        {hasBrandGuidelines && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" />
            Brand guidelines will be applied to AI enhancements
          </div>
        )}

        <div className="flex-1 min-h-0 flex gap-4">
          {/* Left Panel: Inputs */}
          <div className="w-[320px] shrink-0 space-y-4 overflow-y-auto pr-2">
            {/* Images */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Images ({images.length})
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 size-3.5" />
                Upload Images
              </Button>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image src={img.url || "/placeholder.svg"} alt={img.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Texts */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Text Entries ({texts.length})
              </label>

              {texts.map((text) => (
                <div
                  key={text.id}
                  className="p-2 rounded-md border bg-muted/50 text-xs space-y-1 relative group"
                >
                  <p className="font-medium line-clamp-1">{text.headline}</p>
                  <p className="text-muted-foreground line-clamp-2">{text.body}</p>
                  <button
                    type="button"
                    onClick={() => removeText(text.id)}
                    className="absolute top-1 right-1 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}

              <div className="space-y-2 p-3 rounded-lg border border-dashed">
                <Input
                  value={newHeadline}
                  onChange={(e) => setNewHeadline(e.target.value)}
                  placeholder="Headline..."
                  className="text-sm"
                />
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Body copy..."
                  rows={2}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addText}
                  disabled={!newHeadline.trim() || !newBody.trim()}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add Text
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v as "manual" | "ai_enhanced")}
              >
                <ToggleGroupItem value="manual" size="sm">
                  Manual (Free)
                </ToggleGroupItem>
                <ToggleGroupItem value="ai_enhanced" size="sm">
                  AI Enhanced
                </ToggleGroupItem>
              </ToggleGroup>

              {mode === "ai_enhanced" && combinations.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleEnhance}
                  disabled={enhancing || combinations.length === 0}
                >
                  {enhancing ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1.5 size-3.5" />
                      Enhance All ({totalEnhanceCost} credits)
                    </>
                  )}
                </Button>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <ScrollArea className="h-[calc(100%-40px)]">
              {combinations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ImageIcon className="size-10 opacity-40 mb-3" />
                  <p className="text-sm font-medium">No combinations yet</p>
                  <p className="text-xs mt-1">
                    Add images and text entries to see combinations
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pr-4">
                  {combinations.map((combo) => {
                    const showEnhanced =
                      mode === "ai_enhanced" && combo.enhancedHeadline;
                    return (
                      <Card key={combo.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Image src={combo.image.url || "/placeholder.svg"} alt={combo.image.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                          <div className="p-3 space-y-1">
                            {showEnhanced && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] mb-1"
                              >
                                AI Enhanced
                              </Badge>
                            )}
                            <p className="text-sm font-semibold line-clamp-2">
                              {showEnhanced
                                ? combo.enhancedHeadline
                                : combo.text.headline}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {showEnhanced
                                ? combo.enhancedBody
                                : combo.text.body}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
