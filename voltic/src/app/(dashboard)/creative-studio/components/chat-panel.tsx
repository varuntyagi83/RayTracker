"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquareText } from "lucide-react";
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
} from "@/types/creative-studio";
import { LLM_MODELS } from "@/types/creative-studio";

interface ChatPanelProps {
  conversation: StudioConversation | null;
  messages: StudioMessage[];
  onMessagesUpdated: () => void;
  onModelChange: (provider: LLMProvider, model: string) => void;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MentionEditorRef>(null);

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

  const handleSubmit = useCallback(
    async (content: string, mentions: Mention[]) => {
      if (!conversation || streaming) return;

      setStreaming(true);
      setStreamContent("");

      try {
        const response = await fetch("/api/studio/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: content,
            mentions,
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
      } finally {
        setStreaming(false);
        setStreamContent("");
        onMessagesUpdated();
      }
    },
    [conversation, streaming, onMessagesUpdated]
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
              onSaveAsAsset={
                msg.role === "assistant"
                  ? (content) => setSaveContent(content)
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
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
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

      {/* Save as Asset Dialog */}
      <SaveAsAssetDialog
        open={!!saveContent}
        onOpenChange={(open) => !open && setSaveContent(null)}
        content={saveContent ?? ""}
      />
    </div>
  );
}
