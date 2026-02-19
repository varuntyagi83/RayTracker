"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONT_OPTIONS, TEXT_POSITION_OPTIONS } from "@/types/ads";
import type { TextPosition, TextPositionType } from "@/types/ads";

interface StylingControlsProps {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
  onFontFamilyChange: (v: string) => void;
  onFontSizeChange: (v: number) => void;
  onTextColorChange: (v: string) => void;
  onTextPositionChange: (v: TextPosition) => void;
  disabled?: boolean;
}

export function StylingControls({
  fontFamily,
  fontSize,
  textColor,
  textPosition,
  onFontFamilyChange,
  onFontSizeChange,
  onTextColorChange,
  onTextPositionChange,
  disabled,
}: StylingControlsProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Styling</label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Font Family */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Font</label>
          <Select
            value={fontFamily}
            onValueChange={onFontFamilyChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Size ({fontSize}px)
          </label>
          <Input
            type="number"
            min={8}
            max={200}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value) || 48)}
            disabled={disabled}
          />
        </div>

        {/* Text Color */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onTextColorChange(e.target.value)}
              disabled={disabled}
              className="h-10 w-12 rounded border cursor-pointer"
            />
            <Input
              value={textColor}
              onChange={(e) => onTextColorChange(e.target.value)}
              disabled={disabled}
              className="flex-1"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        {/* Text Position */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Position</label>
          <Select
            value={textPosition.type}
            onValueChange={(v) =>
              onTextPositionChange({ ...textPosition, type: v as TextPositionType })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_POSITION_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom X/Y */}
      {textPosition.type === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">X position</label>
            <Input
              type="number"
              value={textPosition.x ?? 512}
              onChange={(e) =>
                onTextPositionChange({
                  ...textPosition,
                  x: Number(e.target.value) || 0,
                })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Y position</label>
            <Input
              type="number"
              value={textPosition.y ?? 512}
              onChange={(e) =>
                onTextPositionChange({
                  ...textPosition,
                  y: Number(e.target.value) || 0,
                })
              }
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
