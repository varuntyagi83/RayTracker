-- Phase 23: MCP Server tables

-- ─── MCP API Keys ────────────────────────────────────────────────────────────
-- Stores hashed API keys for MCP client authentication.
-- The raw key is shown once at creation and never stored.

CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,        -- SHA-256 of the raw key
  name TEXT NOT NULL,                   -- e.g. "Claude Cowork", "n8n Production"
  scopes TEXT[] NOT NULL DEFAULT '{}',  -- ['read', 'write', 'ai']
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_workspace_id ON mcp_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_key_hash ON mcp_api_keys(key_hash);

-- ─── Downloaded Media ─────────────────────────────────────────────────────────
-- Records of competitor media downloaded via MCP download_ad_media tool.

CREATE TABLE IF NOT EXISTS downloaded_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  original_url TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL,  -- 'image' | 'video'
  file_size INTEGER NOT NULL,
  filename TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloaded_media_workspace_id ON downloaded_media(workspace_id);
CREATE INDEX IF NOT EXISTS idx_downloaded_media_brand_name ON downloaded_media(brand_name);
