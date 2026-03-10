import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export async function resolveWorkspaceFromApiKey(apiKey: string): Promise<{
  workspaceId: string;
  scopes: string[];
} | null> {
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const admin = createAdminClient() as AnySupabaseClient;

  const { data } = (await admin
    .from("mcp_api_keys")
    .select("workspace_id, scopes, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single()) as {
    data: {
      workspace_id: string;
      scopes: string[] | null;
      is_active: boolean;
      expires_at: string | null;
    } | null;
    error: unknown;
  };

  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  admin
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then(() => {})
    .catch((err: unknown) => {
      console.error("[mcp-auth] Failed to update last_used_at:", err);
    });

  return { workspaceId: data.workspace_id, scopes: data.scopes ?? [] };
}

export function generateApiKey(): string {
  const raw = randomBytes(32).toString("hex");
  return `vlt_sk_${raw}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
