-- Phase 24: Video Analysis tables

-- ─── video_analyses ───────────────────────────────────────────────────────────
-- Stores AI analysis results for downloaded competitor videos.

CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  downloaded_media_id UUID REFERENCES downloaded_media(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'gpt4o')),
  analysis_depth TEXT NOT NULL CHECK (analysis_depth IN ('quick', 'detailed')),
  hook JSONB,
  narrative JSONB,
  cta JSONB,
  brand_elements JSONB,
  text_overlays JSONB,
  competitive_insight TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_analyses_workspace_id ON video_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_brand_name ON video_analyses(workspace_id, brand_name);
CREATE INDEX IF NOT EXISTS idx_video_analyses_status ON video_analyses(workspace_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_video_analyses_created_at ON video_analyses(created_at);

-- ─── hooks_matrix_runs ────────────────────────────────────────────────────────
-- Stores hooks matrix generation runs.

CREATE TABLE IF NOT EXISTS hooks_matrix_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  competitor_brands TEXT[] NOT NULL DEFAULT '{}',
  video_analysis_ids UUID[] NOT NULL DEFAULT '{}',
  your_brand_name TEXT NOT NULL,
  brand_guidelines_id UUID,
  hook_count INTEGER NOT NULL DEFAULT 45,
  strategies TEXT[] NOT NULL DEFAULT '{}',
  result JSONB,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hooks_matrix_runs_workspace_id ON hooks_matrix_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hooks_matrix_runs_created_at ON hooks_matrix_runs(created_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video analyses" ON public.video_analyses
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Members can insert video analyses" ON public.video_analyses
  FOR INSERT TO authenticated WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Members can update video analyses" ON public.video_analyses
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Members can delete video analyses" ON public.video_analyses
  FOR DELETE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

ALTER TABLE public.hooks_matrix_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view hooks matrix runs" ON public.hooks_matrix_runs
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Members can insert hooks matrix runs" ON public.hooks_matrix_runs
  FOR INSERT TO authenticated WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Members can delete hooks matrix runs" ON public.hooks_matrix_runs
  FOR DELETE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
