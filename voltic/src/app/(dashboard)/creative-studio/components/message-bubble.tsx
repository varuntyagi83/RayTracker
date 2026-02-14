"use client";

import { useState } from "react";
import Image from "next/image";
import { User, Bot, Save, FileText, Download, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioMessage, MessageAttachment } from "@/types/creative-studio";

interface MessageBubbleProps {
  message: StudioMessage;
  conversationId?: string;
  onSaveAsAsset?: (content: string) => void;
  onMessagesUpdated?: () => void;
}

// ─── Parse [Image Prompt] from message content ─────────────────────────────

function parseImagePrompt(content: string): {
  cleanContent: string;
  imagePrompt: string | null;
} {
  const match = content.match(/\[Image Prompt\]\s*\n?([\s\S]+?)$/i);
  if (!match) return { cleanContent: content, imagePrompt: null };

  const cleanContent = content.slice(0, match.index).trimEnd();
  const imagePrompt = match[1].trim();
  return { cleanContent, imagePrompt };
}

// ─── Attachment Grid ────────────────────────────────────────────────────────

function AttachmentGrid({ attachments }: { attachments: MessageAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type.startsWith("image/"));
  const files = attachments.filter((a) => !a.type.startsWith("image/"));

  return (
    <div className="space-y-2 mt-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <a
              key={i}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Image src={img.url || "/placeholder.svg"} alt={img.name} width={200} height={200} className="max-w-[300px] max-h-[300px] rounded-md border object-cover hover:opacity-90 transition-opacity" unoptimized />
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border bg-background/50 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="font-medium truncate max-w-[140px]">{file.name}</span>
              <Download className="size-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Image Generation Block ─────────────────────────────────────────────────

function ImageGenerationBlock({
  imagePrompt,
  messageId,
  conversationId,
  onGenerated,
}: {
  imagePrompt: string;
  messageId: string;
  conversationId: string;
  onGenerated?: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          messageId,
          conversationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Image generation failed");
      }

      const data = await res.json();
      setGeneratedUrl(data.url);
      onGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  if (generatedUrl) {
    return (
      <div className="mt-3 space-y-1">
        <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
          <Image src={generatedUrl || "/placeholder.svg"} alt="Generated creative" width={200} height={200} className="max-w-[400px] rounded-lg border hover:opacity-90 transition-opacity" unoptimized />
        </a>
        <p className="text-xs text-muted-foreground">Generated with GPT Image</p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed space-y-2">
      <div className="flex items-start gap-2">
        <ImageIcon className="size-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Image Prompt Ready
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {imagePrompt}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        className="h-8 text-xs"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <Loader2 className="size-3 mr-1.5 animate-spin" />
            Generating image...
          </>
        ) : (
          <>
            <ImageIcon className="size-3 mr-1.5" />
            Generate Image
          </>
        )}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  conversationId,
  onSaveAsAsset,
  onMessagesUpdated,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const attachments = (message.attachments ?? []) as MessageAttachment[];

  // For assistant messages, check for [Image Prompt] section
  const { cleanContent, imagePrompt } = isUser
    ? { cleanContent: message.content, imagePrompt: null }
    : parseImagePrompt(message.content);

  // Check if the message already has a generated image (don't show generate button again)
  const hasGeneratedImage = attachments.some(
    (a) => a.type.startsWith("image/") && a.name === "generated-image.png"
  );

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
            ? "bg-emerald-50 border border-emerald-200 text-emerald-950"
            : "bg-muted border"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {cleanContent}
        </div>

        {/* Attachments */}
        <AttachmentGrid attachments={attachments} />

        {/* Image Generation Block — only for assistant messages with [Image Prompt] and no existing generated image */}
        {!isUser && imagePrompt && !hasGeneratedImage && conversationId && (
          <ImageGenerationBlock
            imagePrompt={imagePrompt}
            messageId={message.id}
            conversationId={message.conversationId}
            onGenerated={onMessagesUpdated}
          />
        )}

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
