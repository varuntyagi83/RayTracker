"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColorSwatch } from "@/types/brand-guidelines";

interface ColorPaletteEditorProps {
  value: ColorSwatch[];
  onChange: (colors: ColorSwatch[]) => void;
  disabled?: boolean;
}

export function ColorPaletteEditor({ value, onChange, disabled }: ColorPaletteEditorProps) {
  const [newHex, setNewHex] = useState("#");
  const [newName, setNewName] = useState("");

  const addColor = () => {
    const hex = newHex.trim();
    const name = newName.trim() || `Color ${value.length + 1}`;

    if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) return;
    if (value.length >= 12) return;

    onChange([...value, { hex, name }]);
    setNewHex("#");
    setNewName("");
  };

  const removeColor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, field: "hex" | "name", val: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Color swatches */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((color, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 pr-1"
            >
              <div
                className="size-8 rounded-md border shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <div className="min-w-0">
                <Input
                  value={color.name}
                  onChange={(e) => updateColor(i, "name", e.target.value)}
                  className="h-6 text-xs border-0 bg-transparent p-0 w-20"
                  disabled={disabled}
                  aria-label={`Color ${i + 1} name`}
                />
                <Input
                  value={color.hex}
                  onChange={(e) => updateColor(i, "hex", e.target.value)}
                  className="h-5 text-xs text-muted-foreground border-0 bg-transparent p-0 w-20 font-mono"
                  disabled={disabled}
                  aria-label={`Color ${i + 1} hex value`}
                />
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removeColor(i)}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new color */}
      {!disabled && value.length < 12 && (
        <div className="flex items-center gap-2">
          <div
            className="size-8 rounded-md border shrink-0"
            style={{ backgroundColor: /^#[0-9a-fA-F]{3,8}$/.test(newHex) ? newHex : "#ccc" }}
          />
          <Input
            value={newHex}
            onChange={(e) => setNewHex(e.target.value)}
            placeholder="#FF6B35"
            className="w-28 font-mono text-sm"
            aria-label="New color hex value"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Color name"
            className="flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addColor()}
            aria-label="New color name"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addColor}
            disabled={!/^#[0-9a-fA-F]{3,8}$/.test(newHex.trim())}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}

      {value.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground">No colors defined</p>
      )}
    </div>
  );
}
