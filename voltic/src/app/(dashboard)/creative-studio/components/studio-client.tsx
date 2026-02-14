"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatPanel } from "./chat-panel";
import {
  fetchConversationsAction,
  fetchConversationAction,
  createConversationAction,
  updateConversationAction,
  deleteConversationAction,
} from "../actions";
import type {
  StudioConversation,
  StudioMessage,
  LLMProvider,
} from "@/types/creative-studio";

export default function StudioClient() {
  const [conversations, setConversations] = useState<StudioConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<StudioConversation | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    const result = await fetchConversationsAction();
    if (result.data) setConversations(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(async (id: string) => {
    const result = await fetchConversationAction({ id });
    if (result.conversation) {
      setActiveConversation(result.conversation);
      setMessages(result.messages ?? []);
    }
  }, []);

  const handleNewConversation = useCallback(async (provider: LLMProvider, model: string) => {
    const result = await createConversationAction({
      llmProvider: provider,
      llmModel: model,
    });

    if (result.success && result.id) {
      await loadConversations();
      await selectConversation(result.id);
    }
  }, [loadConversations, selectConversation]);

  const handleRename = useCallback(
    async (id: string, title: string) => {
      await updateConversationAction({ id, title });
      await loadConversations();
      if (activeConversation?.id === id) {
        setActiveConversation((prev) => (prev ? { ...prev, title } : null));
      }
    },
    [loadConversations, activeConversation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversationAction({ id });
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
      await loadConversations();
    },
    [loadConversations, activeConversation]
  );

  const handleModelChange = useCallback(
    async (provider: LLMProvider, model: string) => {
      if (!activeConversation) return;
      await updateConversationAction({
        id: activeConversation.id,
        llmProvider: provider,
        llmModel: model,
      });
      setActiveConversation((prev) =>
        prev ? { ...prev, llmProvider: provider, llmModel: model } : null
      );
    },
    [activeConversation]
  );

  const handleMessagesUpdated = useCallback(async () => {
    if (!activeConversation) return;
    const result = await fetchConversationAction({ id: activeConversation.id });
    if (result.messages) setMessages(result.messages);
    await loadConversations();
  }, [activeConversation, loadConversations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={selectConversation}
        onNew={handleNewConversation}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <ChatPanel
        conversation={activeConversation}
        messages={messages}
        onMessagesUpdated={handleMessagesUpdated}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
