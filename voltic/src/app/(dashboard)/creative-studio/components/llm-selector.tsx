"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/types/creative-studio";
import type { LLMProvider } from "@/types/creative-studio";

interface LLMSelectorProps {
  provider: LLMProvider;
  model: string;
  onChange: (provider: LLMProvider, model: string) => void;
  disabled?: boolean;
}

export function LLMSelector({ provider, model, onChange, disabled }: LLMSelectorProps) {
  const value = `${provider}:${model}`;

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        const found = LLM_MODELS.find((m) => `${m.provider}:${m.model}` === val);
        if (found) onChange(found.provider, found.model);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LLM_MODELS.map((m) => (
          <SelectItem key={`${m.provider}:${m.model}`} value={`${m.provider}:${m.model}`}>
            <span className="font-medium">{m.label}</span>
            <span className="text-muted-foreground ml-1">({m.creditCost} cr)</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
