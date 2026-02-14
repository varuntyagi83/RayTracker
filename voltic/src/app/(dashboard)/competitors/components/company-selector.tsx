"use client";

import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { CompetitorBrand } from "@/types/competitors";

interface CompanySelectorProps {
  brands: CompetitorBrand[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export function CompanySelector({
  brands,
  selected,
  onToggle,
  onToggleAll,
}: CompanySelectorProps) {
  const allSelected = brands.length > 0 && selected.size === brands.length;

  return (
    <div className="space-y-1">
      {/* Select all header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label="Select all"
        />
        <span className="text-sm font-medium text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} of ${brands.length} selected`
            : `${brands.length} competitor${brands.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Brand list */}
      {brands.map((brand) => (
        <label
          key={brand.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
        >
          <Checkbox
            checked={selected.has(brand.id)}
            onCheckedChange={() => onToggle(brand.id)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{brand.name}</span>
              <Badge variant="secondary" className="text-xs">
                {brand.adCount} ad{brand.adCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            {brand.lastScrapedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Last scraped{" "}
                {formatDistanceToNow(new Date(brand.lastScrapedAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
