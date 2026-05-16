"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  getBrandGuidelines,
  updateBrandGuidelines,
  uploadBrandAsset,
  deleteBrandAsset,
} from "@/lib/data/brand-guidelines";
import type { BrandGuidelines, BrandGuidelineFile } from "@/types/variations";
import { generateApiKey, hashApiKey } from "@/lib/mcp/auth";
import { trackServer } from "@/lib/analytics/posthog-server";
import { getUser } from "@/lib/supabase/queries";
import { db } from "@/lib/db";
import { workspaces, mcpApiKeys } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// ─── Workspace Timezone ─────────────────────────────────────────────────────

export async function fetchWorkspaceTimezone(): Promise<{
  timezone?: string;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  return { timezone: workspace.timezone };
}

const updateTimezoneSchema = z.object({
  timezone: z.string().min(1),
});

export async function updateWorkspaceTimezoneAction(
  input: z.input<typeof updateTimezoneSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = updateTimezoneSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  // Validate against IANA timezones
  const validTimezones = Intl.supportedValuesOf("timeZone");
  if (!validTimezones.includes(parsed.data.timezone)) {
    return { success: false, error: "Invalid timezone" };
  }

  try {
    await db
      .update(workspaces)
      .set({ timezone: parsed.data.timezone })
      .where(eq(workspaces.id, workspace.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return { success: false, error: message };
  }

  return { success: true };
}

// ─── Meta Disconnect ─────────────────────────────────────────────────────────

export async function disconnectMetaAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  try {
    await db
      .update(workspaces)
      .set({ metaAccessToken: null })
      .where(eq(workspaces.id, workspace.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return { success: false, error: message };
  }

  return { success: true };
}

// ─── Fetch Brand Guidelines ────────────────────────────────────────────────

export async function fetchBrandGuidelines(): Promise<{
  data?: BrandGuidelines;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelines = await getBrandGuidelines(workspace.id);
  return { data: guidelines };
}

// ─── Save Brand Guidelines (text fields) ────────────────────────────────────

const saveBrandGuidelinesSchema = z.object({
  brandName: z.string().max(100).optional(),
  brandVoice: z.string().max(1000).optional(),
  colorPalette: z.string().max(500).optional(),
  targetAudience: z.string().max(1000).optional(),
  dosAndDonts: z.string().max(2000).optional(),
});

export async function saveBrandGuidelinesAction(
  input: z.input<typeof saveBrandGuidelinesSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = saveBrandGuidelinesSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await updateBrandGuidelines(workspace.id, parsed.data);
}

// ─── Upload Brand File ──────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

export async function uploadBrandFileAction(
  formData: FormData
): Promise<{ success: boolean; file?: BrandGuidelineFile; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0)
    return { success: false, error: "No file provided" };
  if (file.size > MAX_FILE_SIZE)
    return { success: false, error: "File must be under 10MB" };
  if (!ALLOWED_TYPES.includes(file.type))
    return {
      success: false,
      error: "Only PDF, PNG, JPG, SVG, and WebP files are allowed",
    };

  // Check max 5 files
  const guidelines = await getBrandGuidelines(workspace.id);
  if ((guidelines.files?.length ?? 0) >= 5)
    return { success: false, error: "Maximum 5 brand files allowed" };

  const buffer = Buffer.from(await file.arrayBuffer());
  return await uploadBrandAsset(
    workspace.id,
    file.name,
    buffer,
    file.type,
    file.size
  );
}

// ─── Delete Brand File ──────────────────────────────────────────────────────

const deleteBrandFileSchema = z.object({
  filePath: z.string().min(1),
});

export async function deleteBrandFileAction(
  input: z.input<typeof deleteBrandFileSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteBrandFileSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteBrandAsset(workspace.id, parsed.data.filePath);
}

// ─── MCP API Key Types ────────────────────────────────────────────────────────

export interface McpApiKey {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Create MCP API Key ───────────────────────────────────────────────────────

const createMcpApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
});

export async function createMcpApiKeyAction(
  input: z.input<typeof createMcpApiKeySchema>
): Promise<{
  data?: { id: string; rawKey: string; name: string; scopes: string[]; createdAt: string };
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = createMcpApiKeySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  let inserted: typeof mcpApiKeys.$inferSelect;
  try {
    const rows = await db
      .insert(mcpApiKeys)
      .values({
        workspaceId: workspace.id,
        keyHash,
        name: parsed.data.name,
        scopes: parsed.data.scopes,
        isActive: true,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insert failed";
    return { error: message };
  }

  trackServer("mcp_key_created", user.id, {
    workspace_id: workspace.id,
    key_id: inserted.id,
    name: inserted.name,
    scopes: inserted.scopes,
  });

  return {
    data: {
      id: inserted.id,
      rawKey,
      name: inserted.name,
      scopes: inserted.scopes,
      createdAt: inserted.createdAt.toISOString(),
    },
  };
}

// ─── List MCP API Keys ────────────────────────────────────────────────────────

export async function listMcpApiKeysAction(): Promise<{
  data?: McpApiKey[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  let rows: (typeof mcpApiKeys.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(mcpApiKeys)
      .where(eq(mcpApiKeys.workspaceId, workspace.id))
      .orderBy(desc(mcpApiKeys.createdAt));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    return { error: message };
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      scopes: row.scopes ?? [],
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

// ─── Delete MCP API Key ───────────────────────────────────────────────────────

const deleteMcpApiKeySchema = z.object({
  keyId: z.string().uuid("Invalid key ID"),
});

export async function deleteMcpApiKeyAction(
  input: z.input<typeof deleteMcpApiKeySchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = deleteMcpApiKeySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  try {
    await db
      .delete(mcpApiKeys)
      .where(
        and(
          eq(mcpApiKeys.id, parsed.data.keyId),
          eq(mcpApiKeys.workspaceId, workspace.id)
        )
      );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return { success: false, error: message };
  }

  trackServer("mcp_key_deleted", user.id, {
    workspace_id: workspace.id,
    key_id: parsed.data.keyId,
  });

  return { success: true };
}

// ─── Toggle MCP API Key ───────────────────────────────────────────────────────

const toggleMcpApiKeySchema = z.object({
  keyId: z.string().uuid("Invalid key ID"),
  isActive: z.boolean(),
});

export async function toggleMcpApiKeyAction(
  input: z.input<typeof toggleMcpApiKeySchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = toggleMcpApiKeySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  try {
    await db
      .update(mcpApiKeys)
      .set({ isActive: parsed.data.isActive })
      .where(
        and(
          eq(mcpApiKeys.id, parsed.data.keyId),
          eq(mcpApiKeys.workspaceId, workspace.id)
        )
      );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return { success: false, error: message };
  }

  trackServer("mcp_key_toggled", user.id, {
    workspace_id: workspace.id,
    key_id: parsed.data.keyId,
    is_active: parsed.data.isActive,
  });

  return { success: true };
}
