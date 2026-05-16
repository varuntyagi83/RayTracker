import { db } from "@/lib/db";
import {
  studioConversations,
  studioMessages,
  brandGuidelinesTable,
  assets,
  competitorReports,
} from "@/db/schema";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";
import type {
  StudioConversation,
  StudioMessage,
  MentionableItem,
  Mention,
  LLMProvider,
} from "@/types/creative-studio";

// ─── Conversations ──────────────────────────────────────────────────────────

export async function listConversations(
  workspaceId: string
): Promise<StudioConversation[]> {
  // Fetch conversations ordered by updated_at desc
  const conversations = await db
    .select()
    .from(studioConversations)
    .where(eq(studioConversations.workspaceId, workspaceId))
    .orderBy(desc(studioConversations.updatedAt));

  if (conversations.length === 0) return [];

  // For each conversation, fetch the latest message (N queries but avoids complex lateral join)
  const results = await Promise.all(
    conversations.map(async (row) => {
      const [lastMsg] = await db
        .select({ content: studioMessages.content, createdAt: studioMessages.createdAt })
        .from(studioMessages)
        .where(eq(studioMessages.conversationId, row.id))
        .orderBy(desc(studioMessages.createdAt))
        .limit(1);

      return {
        id: row.id,
        title: row.title,
        llmProvider: row.llmProvider as LLMProvider,
        llmModel: row.llmModel,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        lastMessage: lastMsg?.content
          ? lastMsg.content.slice(0, 100)
          : undefined,
      };
    })
  );

  return results;
}

export async function getConversation(
  workspaceId: string,
  id: string
): Promise<StudioConversation | null> {
  const [row] = await db
    .select()
    .from(studioConversations)
    .where(
      and(
        eq(studioConversations.workspaceId, workspaceId),
        eq(studioConversations.id, id)
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    llmProvider: row.llmProvider as LLMProvider,
    llmModel: row.llmModel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createConversation(
  workspaceId: string,
  params: { title?: string; llmProvider: LLMProvider; llmModel: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [inserted] = await db
      .insert(studioConversations)
      .values({
        workspaceId,
        title: params.title ?? "New Conversation",
        llmProvider: params.llmProvider,
        llmModel: params.llmModel,
      })
      .returning({ id: studioConversations.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateConversation(
  workspaceId: string,
  id: string,
  updates: Partial<{ title: string; llmProvider: LLMProvider; llmModel: string }>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Partial<typeof studioConversations.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.llmProvider !== undefined) updateData.llmProvider = updates.llmProvider;
  if (updates.llmModel !== undefined) updateData.llmModel = updates.llmModel;

  try {
    await db
      .update(studioConversations)
      .set(updateData)
      .where(
        and(
          eq(studioConversations.workspaceId, workspaceId),
          eq(studioConversations.id, id)
        )
      );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteConversation(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(studioConversations)
      .where(
        and(
          eq(studioConversations.workspaceId, workspaceId),
          eq(studioConversations.id, id)
        )
      );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(
  workspaceId: string,
  conversationId: string
): Promise<StudioMessage[]> {
  const rows = await db
    .select()
    .from(studioMessages)
    .where(
      and(
        eq(studioMessages.workspaceId, workspaceId),
        eq(studioMessages.conversationId, conversationId)
      )
    )
    .orderBy(asc(studioMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    mentions: (row.mentions as Mention[]) ?? [],
    resolvedContext: row.resolvedContext as Record<string, unknown> | null,
    attachments: (row.attachments as StudioMessage["attachments"]) ?? [],
    creditsUsed: row.creditsUsed,
    createdAt: row.createdAt.toISOString(),
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
  try {
    const [inserted] = await db
      .insert(studioMessages)
      .values({
        workspaceId,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        mentions: message.mentions ?? [],
        resolvedContext: message.resolvedContext ?? null,
        attachments: message.attachments ?? [],
        creditsUsed: message.creditsUsed ?? 0,
      })
      .returning({ id: studioMessages.id });

    // Update conversation updated_at
    await db
      .update(studioConversations)
      .set({ updatedAt: new Date() })
      .where(eq(studioConversations.id, message.conversationId));

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Mentionable Items (for @mention autocomplete) ──────────────────────────

export async function getMentionableItems(
  workspaceId: string,
  query: string
): Promise<MentionableItem[]> {
  const items: MentionableItem[] = [];
  const searchQuery = `%${query}%`;

  // Search brand guidelines by name and slug in parallel
  const [byName, bySlug] = await Promise.all([
    db
      .select({
        id: brandGuidelinesTable.id,
        name: brandGuidelinesTable.name,
        slug: brandGuidelinesTable.slug,
        brandName: brandGuidelinesTable.brandName,
        logoUrl: brandGuidelinesTable.logoUrl,
      })
      .from(brandGuidelinesTable)
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          ilike(brandGuidelinesTable.name, searchQuery)
        )
      )
      .limit(5),
    db
      .select({
        id: brandGuidelinesTable.id,
        name: brandGuidelinesTable.name,
        slug: brandGuidelinesTable.slug,
        brandName: brandGuidelinesTable.brandName,
        logoUrl: brandGuidelinesTable.logoUrl,
      })
      .from(brandGuidelinesTable)
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          ilike(brandGuidelinesTable.slug, searchQuery)
        )
      )
      .limit(5),
  ]);

  const seenIds = new Set<string>();
  for (const g of [...byName, ...bySlug]) {
    if (seenIds.has(g.id)) continue;
    seenIds.add(g.id);
    items.push({
      id: g.id,
      type: "brand_guidelines",
      name: g.name,
      slug: g.slug,
      description: g.brandName ?? undefined,
      imageUrl: g.logoUrl ?? undefined,
    });
  }

  // Search assets
  const assetRows = await db
    .select({
      id: assets.id,
      name: assets.name,
      description: assets.description,
      imageUrl: assets.imageUrl,
    })
    .from(assets)
    .where(
      and(
        eq(assets.workspaceId, workspaceId),
        ilike(assets.name, searchQuery)
      )
    )
    .limit(5);

  for (const a of assetRows) {
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
      imageUrl: a.imageUrl ?? undefined,
    });
  }

  // Search competitor reports
  const reportRows = await db
    .select({
      id: competitorReports.id,
      title: competitorReports.title,
      adCount: competitorReports.adCount,
      competitorBrandNames: competitorReports.competitorBrandNames,
    })
    .from(competitorReports)
    .where(
      and(
        eq(competitorReports.workspaceId, workspaceId),
        ilike(competitorReports.title, searchQuery)
      )
    )
    .orderBy(desc(competitorReports.createdAt))
    .limit(5);

  for (const r of reportRows) {
    const brandNames = r.competitorBrandNames as string[];
    const slug = r.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    items.push({
      id: r.id,
      type: "competitor_report",
      name: r.title,
      slug,
      description: `${r.adCount} ads · ${brandNames.join(", ")}`,
    });
  }

  return items;
}

// ─── Resolve Mentions ───────────────────────────────────────────────────────

export async function resolveMentions(
  workspaceId: string,
  mentions: Mention[]
): Promise<Record<string, unknown>> {
  // Resolve all mentions in parallel instead of sequentially
  const entries = await Promise.all(
    mentions.map(async (mention): Promise<[string, unknown] | null> => {
      if (mention.type === "brand_guidelines") {
        const [row] = await db
          .select()
          .from(brandGuidelinesTable)
          .where(
            and(
              eq(brandGuidelinesTable.workspaceId, workspaceId),
              eq(brandGuidelinesTable.id, mention.id)
            )
          )
          .limit(1);

        if (!row) return null;
        return [
          `@${mention.slug}`,
          {
            type: "brand_guidelines",
            brandName: row.brandName,
            brandVoice: row.brandVoice,
            colorPalette: row.colorPalette,
            typography: row.typography,
            targetAudience: row.targetAudience,
            dosAndDonts: row.dosAndDonts,
          },
        ];
      } else if (mention.type === "asset") {
        const [row] = await db
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.workspaceId, workspaceId),
              eq(assets.id, mention.id)
            )
          )
          .limit(1);

        if (!row) return null;
        return [
          `@${mention.slug}`,
          {
            type: "asset",
            name: row.name,
            description: row.description,
            imageUrl: row.imageUrl,
          },
        ];
      } else if (mention.type === "competitor_report") {
        const [row] = await db
          .select()
          .from(competitorReports)
          .where(
            and(
              eq(competitorReports.workspaceId, workspaceId),
              eq(competitorReports.id, mention.id)
            )
          )
          .limit(1);

        if (!row) return null;
        return [
          `@${mention.slug}`,
          {
            type: "competitor_report",
            title: row.title,
            brandNames: row.competitorBrandNames,
            adCount: row.adCount,
            perAdAnalyses: row.perAdAnalyses,
            crossBrandSummary: row.crossBrandSummary,
          },
        ];
      }
      return null;
    })
  );

  return Object.fromEntries(entries.filter((e): e is [string, unknown] => e !== null));
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
