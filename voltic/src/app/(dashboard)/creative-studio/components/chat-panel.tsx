"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquareText, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentionEditor, type MentionEditorRef } from "@/components/shared/mention-editor";
import { MessageBubble, StreamingBubble } from "./message-bubble";
import { LLMSelector } from "./llm-selector";
import { SaveAsAssetDialog } from "./save-as-asset-dialog";
import { fetchMentionablesAction } from "../actions";
import type {
  StudioConversation,
  StudioMessage,
  Mention,
  LLMProvider,
  MentionableItem,
  MessageAttachment,
} from "@/types/creative-studio";

interface ChatPanelProps {
  conversation: StudioConversation | null;
  messages: StudioMessage[];
  onMessagesUpdated: () => void;
  onModelChange: (provider: LLMProvider, model: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatPanel({
  conversation,
  messages,
  onMessagesUpdated,
  onModelChange,
}: ChatPanelProps) {
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [saveContent, setSaveContent] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MentionEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamContent]);

  const handleMentionQuery = useCallback(async (query: string): Promise<MentionableItem[]> => {
    const result = await fetchMentionablesAction({ query });
    return result.data ?? [];
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => {
      const combined = [...prev, ...selected];
      return combined.slice(0, 5); // Max 5 files
    });
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async (files: File[]): Promise<MessageAttachment[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/api/studio/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Upload failed");
    }

    const data = await res.json();
    return data.files as MessageAttachment[];
  }, []);

  const handleSubmit = useCallback(
    async (content: string, mentions: Mention[]) => {
      if (!conversation || streaming) return;

      setStreaming(true);
      setStreamContent("");

      try {
        // Upload pending files first
        let attachments: MessageAttachment[] = [];
        if (pendingFiles.length > 0) {
          setUploading(true);
          attachments = await uploadFiles(pendingFiles);
          setUploading(false);
          setPendingFiles([]);
        }

        const response = await fetch("/api/studio/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: content,
            mentions,
            attachments,
            provider: conversation.llmProvider,
            model: conversation.llmModel,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamContent(accumulated);
        }

        // Flush any remaining bytes in the decoder buffer
        const finalChunk = decoder.decode();
        if (finalChunk) {
          accumulated += finalChunk;
          setStreamContent(accumulated);
        }
      } catch (err) {
        console.error("Chat error:", err);
        setUploading(false);
      } finally {
        setStreaming(false);
        setStreamContent("");
        onMessagesUpdated();
      }
    },
    [conversation, streaming, pendingFiles, uploadFiles, onMessagesUpdated]
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageSquareText className="size-12 mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-semibold">Creative Studio</h3>
          <p className="text-sm mt-1">
            Start a new conversation or select one from the sidebar.
          </p>
          <p className="text-xs mt-2">
            Use @mentions to reference brand guidelines and assets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b">
        <h3 className="font-semibold truncate">{conversation.title}</h3>
        <LLMSelector
          provider={conversation.llmProvider}
          model={conversation.llmModel}
          onChange={onModelChange}
          disabled={streaming}
        />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                Type a message below. Use <code className="bg-muted px-1 rounded text-xs">@</code> to mention brand guidelines or assets.
              </p>
              <p className="text-xs mt-1">
                Example: &ldquo;Create an ad using @sunday_brand for @product_alpha&rdquo;
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              conversationId={conversation.id}
              onMessagesUpdated={onMessagesUpdated}
              onSaveAsAsset={
                msg.role === "assistant"
                  ? (c) => setSaveContent(c)
                  : undefined
              }
            />
          ))}

          {streaming && streamContent && (
            <StreamingBubble content={streamContent} />
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Pending file previews */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative group flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-xs"
                >
                  {file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="size-8 rounded object-cover"
                    />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-[120px]">{file.name}</p>
                    <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 size-10"
              disabled={streaming || pendingFiles.length >= 5}
              onClick={() => fileInputRef.current?.click()}
              title="Attach files (images, PDF)"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>

            <div className="flex-1">
              <MentionEditor
                ref={editorRef}
                onSubmit={handleSubmit}
                onMentionQuery={handleMentionQuery}
                disabled={streaming}
              />
            </div>
            <Button
              size="icon"
              disabled={streaming}
              className="shrink-0 size-10"
              onClick={() => {
                editorRef.current?.submit();
              }}
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Save as Asset Dialog */}
      <SaveAsAssetDialog
        open={!!saveContent}
        onOpenChange={(open) => !open && setSaveContent(null)}
        content={saveContent ?? ""}
      />
    </div>
  );
}
