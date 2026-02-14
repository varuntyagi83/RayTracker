-- ============================================================================
-- 004_competitors.sql — Competitor ads persistence + reports
-- ============================================================================

-- Competitor scraped ads (linked to competitor_brands)
CREATE TABLE IF NOT EXISTS competitor_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_brand_id UUID NOT NULL REFERENCES competitor_brands(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  meta_library_id TEXT NOT NULL,
  headline TEXT,
  body_text TEXT,
  format TEXT NOT NULL DEFAULT 'image',
  media_type TEXT NOT NULL DEFAULT 'image',
  image_url TEXT,
  video_url TEXT,
  landing_page_url TEXT,
  platforms TEXT[],
  start_date DATE,
  runtime_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ads_library_url TEXT,
  metadata JSONB,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_brand_id ON competitor_ads(competitor_brand_id);
CREATE INDEX IF NOT EXISTS idx_competitor_ads_workspace_id ON competitor_ads(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS competitor_ads_workspace_meta_library_idx
  ON competitor_ads(workspace_id, meta_library_id);

-- AI-generated competitor reports
CREATE TABLE IF NOT EXISTS competitor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  competitor_brand_ids TEXT[] NOT NULL,
  competitor_brand_names TEXT[] NOT NULL,
  ad_count INTEGER NOT NULL DEFAULT 0,
  per_ad_analyses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cross_brand_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_reports_workspace_id ON competitor_reports(workspace_id);

-- Row Level Security
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_competitor_ads" ON competitor_ads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_competitor_reports" ON competitor_reports
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
