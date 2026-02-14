"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  getMentionableItems,
} from "@/lib/data/studio";
import { createAsset } from "@/lib/data/assets";
import type { StudioConversation, StudioMessage, MentionableItem, LLMProvider } from "@/types/creative-studio";

const conversationIdSchema = z.object({ id: z.string().uuid() });
const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  llmProvider: z.enum(["openai", "anthropic", "google"]),
  llmModel: z.string().min(1).max(100),
});
const saveAssetSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

// ─── Conversations ──────────────────────────────────────────────────────────

export async function fetchConversationsAction(): Promise<{
  data?: StudioConversation[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const data = await listConversations(workspace.id);
  return { data };
}

export async function fetchConversationAction(input: {
  id: string;
}): Promise<{
  conversation?: StudioConversation;
  messages?: StudioMessage[];
  error?: string;
}> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid conversation ID" };

  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const conversation = await getConversation(workspace.id, parsed.data.id);
  if (!conversation) return { error: "Not found" };

  const messages = await getMessages(workspace.id, input.id);
  return { conversation, messages };
}

export async function createConversationAction(input: {
  title?: string;
  llmProvider: LLMProvider;
  llmModel: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const parsed = createConversationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await createConversation(workspace.id, {
    title: parsed.data.title,
    llmProvider: parsed.data.llmProvider,
    llmModel: parsed.data.llmModel,
  });
}

export async function updateConversationAction(input: {
  id: string;
  title?: string;
  llmProvider?: LLMProvider;
  llmModel?: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const { id, ...updates } = input;
  return await updateConversation(workspace.id, id, updates);
}

export async function deleteConversationAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await deleteConversation(workspace.id, input.id);
}

// ─── Mentionables ───────────────────────────────────────────────────────────

export async function fetchMentionablesAction(input: {
  query: string;
}): Promise<{ data?: MentionableItem[]; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const data = await getMentionableItems(workspace.id, input.query);
  return { data };
}

// ─── Save Studio Output as Asset ────────────────────────────────────────────

export async function saveStudioOutputAsAssetAction(input: {
  name: string;
  description?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const parsed = saveAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await createAsset(
    workspace.id,
    parsed.data.name,
    parsed.data.imageUrl ?? "",
    parsed.data.description
  );
}
