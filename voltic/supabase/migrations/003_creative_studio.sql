-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 003: Creative Studio — Brand Guidelines, Conversations, Messages
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Brand Guidelines (Named Entities) ──────────────────────────────────────

CREATE TABLE brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  brand_name TEXT,
  brand_voice TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  typography JSONB DEFAULT '{}'::jsonb,
  target_audience TEXT,
  dos_and_donts TEXT,
  logo_url TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX brand_guidelines_workspace_slug_idx ON brand_guidelines(workspace_id, slug);
CREATE INDEX idx_brand_guidelines_workspace_id ON brand_guidelines(workspace_id);

ALTER TABLE brand_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_brand_guidelines" ON brand_guidelines FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ─── Studio Conversations ───────────────────────────────────────────────────

CREATE TABLE studio_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  llm_provider TEXT NOT NULL DEFAULT 'openai',
  llm_model TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_conversations_workspace_id ON studio_conversations(workspace_id);

ALTER TABLE studio_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_studio_conversations" ON studio_conversations FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ─── Studio Messages ────────────────────────────────────────────────────────

CREATE TABLE studio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  resolved_context JSONB,
  attachments JSONB DEFAULT '[]'::jsonb,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_messages_conversation_id ON studio_messages(conversation_id);
CREATE INDEX idx_studio_messages_workspace_id ON studio_messages(workspace_id);

ALTER TABLE studio_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_studio_messages" ON studio_messages FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ─── Storage Bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('studio-attachments', 'studio-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "workspace_members_studio_attachments" ON storage.objects FOR ALL
  USING (bucket_id = 'studio-attachments');
