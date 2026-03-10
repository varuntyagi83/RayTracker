-- Phase 009: Missing tables — ad_insights, ad_comparisons, generated_ads
-- These tables are defined in src/db/schema.ts but were absent from migrations 001-008.
-- All statements use IF NOT EXISTS so this migration is safe to re-run.

-- ─── Ad Insights ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meta_library_id text NOT NULL,
  brand_name text,
  headline text,
  body_text text,
  format text,
  insights jsonb NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o',
  credits_used integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_insights_workspace_meta_library_idx
  ON public.ad_insights(workspace_id, meta_library_id);

CREATE INDEX IF NOT EXISTS idx_ad_insights_workspace_id
  ON public.ad_insights(workspace_id);

-- ─── Ad Comparisons ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ad_ids text[] NOT NULL,
  brand_names text[] NOT NULL,
  result jsonb NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o',
  credits_used integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_comparisons_workspace_id
  ON public.ad_comparisons(workspace_id);

-- ─── Generated Ads ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_guideline_id uuid NOT NULL REFERENCES public.brand_guidelines(id) ON DELETE CASCADE,
  background_asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  text_variant text NOT NULL,
  font_family text NOT NULL DEFAULT 'Inter',
  font_size integer NOT NULL DEFAULT 48,
  text_color text NOT NULL DEFAULT '#FFFFFF',
  text_position jsonb NOT NULL DEFAULT '{"type":"center"}',
  image_url text NOT NULL,
  storage_path text NOT NULL,
  width integer,
  height integer,
  status text NOT NULL DEFAULT 'approved',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_ads_workspace_id
  ON public.generated_ads(workspace_id);

CREATE INDEX IF NOT EXISTS idx_generated_ads_brand_guideline_id
  ON public.generated_ads(brand_guideline_id);

CREATE INDEX IF NOT EXISTS idx_generated_ads_background_asset_id
  ON public.generated_ads(background_asset_id);

CREATE TRIGGER generated_ads_updated_at
  BEFORE UPDATE ON public.generated_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_ads ENABLE ROW LEVEL SECURITY;

-- Ad Insights
CREATE POLICY "Members can view ad insights" ON public.ad_insights FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert ad insights" ON public.ad_insights FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete ad insights" ON public.ad_insights FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Ad Comparisons
CREATE POLICY "Members can view ad comparisons" ON public.ad_comparisons FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert ad comparisons" ON public.ad_comparisons FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete ad comparisons" ON public.ad_comparisons FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Generated Ads
CREATE POLICY "Members can view generated ads" ON public.generated_ads FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert generated ads" ON public.generated_ads FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update generated ads" ON public.generated_ads FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete generated ads" ON public.generated_ads FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
