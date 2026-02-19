import { createAdminClient } from "@/lib/supabase/admin";
import type {
  StudioConversation,
  StudioMessage,
  MentionableItem,
  Mention,
  LLMProvider,
} from "@/types/creative-studio";
import type { BrandGuidelineEntity } from "@/types/brand-guidelines";

// ─── Conversations ──────────────────────────────────────────────────────────

export async function listConversations(
  workspaceId: string
): Promise<StudioConversation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("studio_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  // Get last message for each conversation
  const conversations: StudioConversation[] = [];
  for (const row of data) {
    const { data: lastMsg } = await supabase
      .from("studio_messages")
      .select("content")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    conversations.push({
      id: row.id,
      title: row.title,
      llmProvider: row.llm_provider as LLMProvider,
      llmModel: row.llm_model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessage: lastMsg?.content
        ? (lastMsg.content as string).slice(0, 100)
        : undefined,
    });
  }

  return conversations;
}

export async function getConversation(
  workspaceId: string,
  id: string
): Promise<StudioConversation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    llmProvider: data.llm_provider as LLMProvider,
    llmModel: data.llm_model,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createConversation(
  workspaceId: string,
  params: { title?: string; llmProvider: LLMProvider; llmModel: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_conversations")
    .insert({
      workspace_id: workspaceId,
      title: params.title ?? "New Conversation",
      llm_provider: params.llmProvider,
      llm_model: params.llmModel,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function updateConversation(
  workspaceId: string,
  id: string,
  updates: Partial<{ title: string; llmProvider: LLMProvider; llmModel: string }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.llmProvider !== undefined)
    updateData.llm_provider = updates.llmProvider;
  if (updates.llmModel !== undefined) updateData.llm_model = updates.llmModel;

  const { error } = await supabase
    .from("studio_conversations")
    .update(updateData)
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteConversation(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("studio_conversations")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(
  workspaceId: string,
  conversationId: string
): Promise<StudioMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    mentions: (row.mentions as Mention[]) ?? [],
    resolvedContext: row.resolved_context as Record<string, unknown> | null,
    attachments: (row.attachments as StudioMessage["attachments"]) ?? [],
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  }));
}

export async function createMessage(
  workspaceId: string,
  message: {
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    mentions?: Mention[];
    resolvedContext?: Record<string, unknown>;
    attachments?: StudioMessage["attachments"];
    creditsUsed?: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_messages")
    .insert({
      workspace_id: workspaceId,
      conversation_id: message.conversationId,
      role: message.role,
      content: message.content,
      mentions: message.mentions ?? [],
      resolved_context: message.resolvedContext ?? null,
      attachments: message.attachments ?? [],
      credits_used: message.creditsUsed ?? 0,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Update conversation updated_at
  await supabase
    .from("studio_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", message.conversationId);

  return { success: true, id: data.id };
}

// ─── Mentionable Items (for @mention autocomplete) ──────────────────────────

export async function getMentionableItems(
  workspaceId: string,
  query: string
): Promise<MentionableItem[]> {
  const supabase = createAdminClient();
  const items: MentionableItem[] = [];
  const searchQuery = `%${query}%`;

  // Search brand guidelines by name and slug in parallel
  const [{ data: byName }, { data: bySlug }] = await Promise.all([
    supabase
      .from("brand_guidelines")
      .select("id, name, slug, brand_name, logo_url")
      .eq("workspace_id", workspaceId)
      .ilike("name", searchQuery)
      .limit(5),
    supabase
      .from("brand_guidelines")
      .select("id, name, slug, brand_name, logo_url")
      .eq("workspace_id", workspaceId)
      .ilike("slug", searchQuery)
      .limit(5),
  ]);

  const seenIds = new Set<string>();
  for (const g of [...(byName ?? []), ...(bySlug ?? [])]) {
    if (seenIds.has(g.id)) continue;
    seenIds.add(g.id);
    items.push({
      id: g.id,
      type: "brand_guidelines",
      name: g.name,
      slug: g.slug,
      description: g.brand_name ?? undefined,
      imageUrl: g.logo_url ?? undefined,
    });
  }

  // Search assets
  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, description, image_url")
    .eq("workspace_id", workspaceId)
    .ilike("name", searchQuery)
    .limit(5);

  if (assets) {
    for (const a of assets) {
      const slug = a.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      items.push({
        id: a.id,
        type: "asset",
        name: a.name,
        slug,
        description: a.description ?? undefined,
        imageUrl: a.image_url ?? undefined,
      });
    }
  }

  // Search competitor reports
  const { data: reports } = await supabase
    .from("competitor_reports")
    .select("id, title, ad_count, competitor_brand_names")
    .eq("workspace_id", workspaceId)
    .ilike("title", searchQuery)
    .order("created_at", { ascending: false })
    .limit(5);

  if (reports) {
    for (const r of reports) {
      const brandNames = r.competitor_brand_names as string[];
      const slug = (r.title as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      items.push({
        id: r.id,
        type: "competitor_report",
        name: r.title,
        slug,
        description: `${r.ad_count} ads · ${brandNames.join(", ")}`,
      });
    }
  }

  return items;
}

// ─── Resolve Mentions ───────────────────────────────────────────────────────

export async function resolveMentions(
  workspaceId: string,
  mentions: Mention[]
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient();
  const resolved: Record<string, unknown> = {};

  for (const mention of mentions) {
    if (mention.type === "brand_guidelines") {
      const { data } = await supabase
        .from("brand_guidelines")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", mention.id)
        .single();

      if (data) {
        resolved[`@${mention.slug}`] = {
          type: "brand_guidelines",
          brandName: data.brand_name,
          brandVoice: data.brand_voice,
          colorPalette: data.color_palette,
          typography: data.typography,
          targetAudience: data.target_audience,
          dosAndDonts: data.dos_and_donts,
        };
      }
    } else if (mention.type === "asset") {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", mention.id)
        .single();

      if (data) {
        resolved[`@${mention.slug}`] = {
          type: "asset",
          name: data.name,
          description: data.description,
          imageUrl: data.image_url,
        };
      }
    } else if (mention.type === "competitor_report") {
      const { data } = await supabase
        .from("competitor_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", mention.id)
        .single();

      if (data) {
        resolved[`@${mention.slug}`] = {
          type: "competitor_report",
          title: data.title,
          brandNames: data.competitor_brand_names,
          adCount: data.ad_count,
          perAdAnalyses: data.per_ad_analyses,
          crossBrandSummary: data.cross_brand_summary,
        };
      }
    }
  }

  return resolved;
}

// ─── Build Context String for LLM ──────────────────────────────────────────

export function buildMentionContext(
  resolved: Record<string, unknown>
): string {
  const sections: string[] = [];

  for (const [key, value] of Object.entries(resolved)) {
    const item = value as Record<string, unknown>;

    if (item.type === "brand_guidelines") {
      const palette = Array.isArray(item.colorPalette)
        ? (item.colorPalette as Array<{ hex: string; name: string }>)
            .map((c) => `${c.hex} (${c.name})`)
            .join(", ")
        : "";

      sections.push(
        `--- BRAND GUIDELINES: ${key} ---\n` +
          `Brand: ${item.brandName ?? "N/A"}\n` +
          `Voice: ${item.brandVoice ?? "N/A"}\n` +
          `Colors: ${palette || "N/A"}\n` +
          `Target Audience: ${item.targetAudience ?? "N/A"}\n` +
          `Do's & Don'ts: ${item.dosAndDonts ?? "N/A"}`
      );
    } else if (item.type === "asset") {
      sections.push(
        `--- ASSET: ${key} ---\n` +
          `Name: ${item.name ?? "N/A"}\n` +
          `Description: ${item.description ?? "N/A"}`
      );
    } else if (item.type === "competitor_report") {
      const analyses = item.perAdAnalyses as Array<Record<string, unknown>>;
      const summary = item.crossBrandSummary as Record<string, unknown>;

      let adSection = "";
      if (Array.isArray(analyses)) {
        adSection = analyses
          .map((a, i) => {
            const target = a.targetAudience as Record<string, unknown> | undefined;
            return (
              `  Ad ${i + 1}: ${a.brandName} — "${a.headline ?? "Untitled"}"\n` +
              `    Score: ${a.performanceScore}/10 — ${a.performanceRationale}\n` +
              `    Hook: ${a.hookType} — ${a.hookExplanation}\n` +
              `    CTA: ${a.ctaType} — ${a.ctaAnalysis}\n` +
              `    Target: ${target?.primary ?? "N/A"}\n` +
              `    Strengths: ${(a.strengths as string[])?.join("; ") ?? "N/A"}\n` +
              `    Weaknesses: ${(a.weaknesses as string[])?.join("; ") ?? "N/A"}\n` +
              `    Improvements: ${(a.improvements as string[])?.join("; ") ?? "N/A"}`
            );
          })
          .join("\n\n");
      }

      let summarySection = "";
      if (summary) {
        summarySection =
          `  Common Patterns: ${(summary.commonPatterns as string[])?.join("; ") ?? "N/A"}\n` +
          `  Best Practices: ${(summary.bestPractices as string[])?.join("; ") ?? "N/A"}\n` +
          `  Gaps & Opportunities: ${(summary.gapsAndOpportunities as string[])?.join("; ") ?? "N/A"}\n` +
          `  Market Positioning: ${summary.marketPositioning ?? "N/A"}\n` +
          `  Recommendations: ${(summary.overallRecommendations as string[])?.join("; ") ?? "N/A"}`;
      }

      sections.push(
        `--- COMPETITOR REPORT: ${key} ---\n` +
          `Title: ${item.title ?? "N/A"}\n` +
          `Brands: ${(item.brandNames as string[])?.join(", ") ?? "N/A"}\n` +
          `Ads Analyzed: ${item.adCount ?? 0}\n\n` +
          `PER-AD ANALYSIS:\n${adSection}\n\n` +
          `CROSS-BRAND INSIGHTS:\n${summarySection}`
      );
    }
  }

  return sections.join("\n\n");
}
