-- ============================================================================
-- 005_ad_decompositions.sql — Vision-based ad decomposition engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_decompositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_image_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'saved_ad',
  source_id UUID,
  extracted_texts JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  background_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  clean_image_url TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  credits_used INTEGER NOT NULL DEFAULT 5,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_decompositions_workspace_id ON ad_decompositions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_decompositions_source_image_url ON ad_decompositions(source_image_url);

-- RLS
ALTER TABLE ad_decompositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace decompositions"
  ON ad_decompositions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert decompositions for own workspace"
  ON ad_decompositions FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workspace decompositions"
  ON ad_decompositions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
