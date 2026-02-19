"use client";

import Image from "next/image";
import { Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function BackgroundSelector({
  assets,
  selected,
  onChange,
  disabled,
}: BackgroundSelectorProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="size-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No background assets linked to this guideline.</p>
        <p className="text-xs mt-1">
          Go to Assets and link images to this brand guideline first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
    </div>
  );
}
