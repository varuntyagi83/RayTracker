"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageIcon, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BackgroundAsset {
  id: string;
  name: string;
  imageUrl: string;
}

interface BackgroundSelectorProps {
  assets: BackgroundAsset[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  guidelineId?: string;
  onAssetsChanged?: () => void;
}

export function BackgroundSelector({
  assets,
  selected,
  onChange,
  disabled,
  guidelineId,
  onAssetsChanged,
}: BackgroundSelectorProps) {
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleGenerateBackground = async () => {
    if (!guidelineId) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/assets/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandGuidelineId: guidelineId,
          prompt: prompt.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate background");
      }

      toast.success("Background generated and linked to guideline");
      setPrompt("");
      onAssetsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateSection = guidelineId && (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wand2 className="size-4 text-indigo-500" />
        Generate AI Background
      </div>
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional: describe the style you want..."
          disabled={generating || disabled}
          className="flex-1 text-sm"
        />
        <Button
          size="sm"
          onClick={handleGenerateBackground}
          disabled={generating || disabled}
        >
          {generating ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="size-3.5 mr-1.5" />
              Generate
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Uses your brand guidelines (colors, audience, voice) to create a matching background.
      </p>
    </div>
  );

  if (assets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 text-muted-foreground">
          <ImageIcon className="size-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No background assets linked to this guideline.</p>
          <p className="text-xs mt-1">
            Generate one below, or go to Assets to upload and link images.
          </p>
        </div>
        {generateSection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Background Images{" "}
        <span className="text-muted-foreground font-normal">
          ({selected.length} selected)
        </span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {assets.map((asset) => {
          const isSelected = selected.includes(asset.id);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => toggle(asset.id)}
              disabled={disabled}
              className={cn(
                "relative rounded-lg overflow-hidden border-2 transition-all aspect-square",
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <Image
                src={asset.imageUrl}
                alt={asset.name}
                fill
                className="object-cover"
                sizes="150px"
                unoptimized
              />
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="size-3" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <p className="text-[10px] text-white truncate">{asset.name}</p>
              </div>
            </button>
          );
        })}
      </div>
      {generateSection}
    </div>
  );
}
