"use client";

import { useState } from "react";
import { User, Bot, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioMessage } from "@/types/creative-studio";

interface MessageBubbleProps {
  message: StudioMessage;
  onSaveAsAsset?: (content: string) => void;
}

export function MessageBubble({ message, onSaveAsAsset }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-emerald-100 text-emerald-700"
            : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-muted border"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Save as Asset button for assistant messages */}
        {!isUser && onSaveAsAsset && (
          <div className="mt-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onSaveAsAsset(message.content)}
            >
              <Save className="size-3 mr-1" />
              Save as Asset
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Streaming Message ──────────────────────────────────────────────────────

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="size-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-700">
        <Bot className="size-4" />
      </div>
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted border">
        <div className="text-sm whitespace-pre-wrap break-words">
          {content}
          <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  );
}
