"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TextVariantsFormProps {
  texts: string[];
  onChange: (texts: string[]) => void;
  disabled?: boolean;
}

export function TextVariantsForm({
  texts,
  onChange,
  disabled,
}: TextVariantsFormProps) {
  const addText = () => {
    if (texts.length >= 10) return;
    onChange([...texts, ""]);
  };

  const removeText = (index: number) => {
    if (texts.length <= 1) return;
    onChange(texts.filter((_, i) => i !== index));
  };

  const updateText = (index: number, value: string) => {
    const updated = [...texts];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Text Variants{" "}
          <span className="text-muted-foreground font-normal">
            ({texts.length}/10)
          </span>
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={addText}
          disabled={disabled || texts.length >= 10}
        >
          <Plus className="size-3.5 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {texts.map((text, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => updateText(i, e.target.value)}
              placeholder={`Text variant ${i + 1}...`}
              disabled={disabled}
            />
            {texts.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeText(i)}
                disabled={disabled}
                className="shrink-0"
                aria-label={`Remove text ${i + 1}`}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Each text will be composited on every selected background (M texts x N
        backgrounds).
      </p>
    </div>
  );
}
