"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GuidelineSelectorProps {
  guidelines: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function GuidelineSelector({
  guidelines,
  value,
  onChange,
  disabled,
}: GuidelineSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Brand Guideline</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select a brand guideline..." />
        </SelectTrigger>
        <SelectContent>
          {guidelines.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Choose a brand guideline to load its linked background assets.
      </p>
    </div>
  );
}
