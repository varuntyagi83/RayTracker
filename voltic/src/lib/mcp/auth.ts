import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { mcpApiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function resolveWorkspaceFromApiKey(apiKey: string): Promise<{
  workspaceId: string;
  scopes: string[];
} | null> {
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const [data] = await db
    .select({
      workspaceId: mcpApiKeys.workspaceId,
      scopes: mcpApiKeys.scopes,
      isActive: mcpApiKeys.isActive,
      expiresAt: mcpApiKeys.expiresAt,
      keyHash: mcpApiKeys.keyHash,
    })
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.keyHash, keyHash))
    .limit(1);

  if (!data || !data.isActive) return null;
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  db.update(mcpApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpApiKeys.keyHash, keyHash))
    .then(() => {})
    .catch((err: unknown) => {
      console.error("[mcp-auth] Failed to update last_used_at:", err);
    });

  return { workspaceId: data.workspaceId, scopes: data.scopes ?? [] };
}

export function generateApiKey(): string {
  const raw = randomBytes(32).toString("hex");
  return `vlt_sk_${raw}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
