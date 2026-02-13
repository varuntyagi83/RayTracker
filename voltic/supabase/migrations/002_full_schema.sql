-- Phase 2: Full database schema (all remaining tables)
-- Run this in Supabase Dashboard SQL Editor

-- ─── Ad Accounts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meta_account_id text UNIQUE NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_workspace_id ON public.ad_accounts(workspace_id);

CREATE TRIGGER ad_accounts_updated_at
  BEFORE UPDATE ON public.ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Campaigns ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  objective text,
  daily_budget decimal(12,2),
  lifetime_budget decimal(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON public.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account_id ON public.campaigns(ad_account_id);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Campaign Metrics ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  spend decimal(12,2) NOT NULL DEFAULT 0,
  revenue decimal(12,2) NOT NULL DEFAULT 0,
  roas decimal(8,4) NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  ctr decimal(8,4) NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  landing_page_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON public.campaign_metrics(date);

-- ─── Creatives ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  meta_creative_id text,
  name text NOT NULL,
  headline text,
  body text,
  landing_page_url text,
  image_url text,
  video_url text,
  format text NOT NULL DEFAULT 'image',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creatives_workspace_id ON public.creatives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_creatives_campaign_id ON public.creatives(campaign_id);

CREATE TRIGGER creatives_updated_at
  BEFORE UPDATE ON public.creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Creative Metrics ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creative_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  date date NOT NULL,
  spend decimal(12,2) NOT NULL DEFAULT 0,
  revenue decimal(12,2) NOT NULL DEFAULT 0,
  roas decimal(8,4) NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  ctr decimal(8,4) NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  landing_page_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_metrics_creative_id ON public.creative_metrics(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_metrics_date ON public.creative_metrics(date);

-- ─── Automations ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  config jsonb NOT NULL DEFAULT '{}',
  schedule jsonb NOT NULL DEFAULT '{}',
  delivery jsonb NOT NULL DEFAULT '{}',
  classification jsonb,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON public.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_type ON public.automations(type);

CREATE TRIGGER automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Automation Runs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  items_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON public.automation_runs(automation_id);

-- ─── Boards ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON public.boards(workspace_id);

CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Saved Ads ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'discover',
  meta_library_id text,
  brand_name text,
  headline text,
  body text,
  format text NOT NULL DEFAULT 'image',
  image_url text,
  video_url text,
  landing_page_url text,
  platforms text[],
  start_date date,
  runtime_days integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_ads_board_id ON public.saved_ads(board_id);
CREATE INDEX IF NOT EXISTS idx_saved_ads_workspace_id ON public.saved_ads(workspace_id);

-- ─── Assets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace_id ON public.assets(workspace_id);

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Variations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  saved_ad_id uuid NOT NULL REFERENCES public.saved_ads(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  strategy text NOT NULL,
  generated_image_url text,
  generated_headline text,
  generated_body text,
  credits_used integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variations_workspace_id ON public.variations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_variations_saved_ad_id ON public.variations(saved_ad_id);

-- ─── Credit Transactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace_id ON public.credit_transactions(workspace_id);

-- ─── Competitor Brands ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  meta_ads_library_url text,
  description text,
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_brands_workspace_id ON public.competitor_brands(workspace_id);

CREATE TRIGGER competitor_brands_updated_at
  BEFORE UPDATE ON public.competitor_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Facebook Pages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facebook_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  has_instagram boolean NOT NULL DEFAULT false,
  instagram_handle text,
  access_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_workspace_id ON public.facebook_pages(workspace_id);

-- ─── Comments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  post_id text NOT NULL,
  commenter_name text NOT NULL,
  commenter_id text NOT NULL,
  comment_text text NOT NULL,
  comment_time timestamptz NOT NULL,
  post_type text NOT NULL DEFAULT 'organic',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_workspace_id ON public.comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_page_id ON public.comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_read ON public.comments(is_read);

-- ─── RLS Policies for all new tables ─────────────────────────────────────────

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper: workspace members can access their workspace data
-- All policies follow the same pattern: user must be a member of the workspace

-- Ad Accounts
CREATE POLICY "Members can view ad accounts" ON public.ad_accounts FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert ad accounts" ON public.ad_accounts FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update ad accounts" ON public.ad_accounts FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Campaigns
CREATE POLICY "Members can view campaigns" ON public.campaigns FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert campaigns" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update campaigns" ON public.campaigns FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Campaign Metrics
CREATE POLICY "Members can view campaign metrics" ON public.campaign_metrics FOR SELECT
  USING (campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE wm.user_id = auth.uid()
  ));
CREATE POLICY "Members can insert campaign metrics" ON public.campaign_metrics FOR INSERT TO authenticated
  WITH CHECK (campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- Creatives
CREATE POLICY "Members can view creatives" ON public.creatives FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert creatives" ON public.creatives FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update creatives" ON public.creatives FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Creative Metrics
CREATE POLICY "Members can view creative metrics" ON public.creative_metrics FOR SELECT
  USING (creative_id IN (
    SELECT cr.id FROM public.creatives cr
    JOIN public.workspace_members wm ON wm.workspace_id = cr.workspace_id
    WHERE wm.user_id = auth.uid()
  ));
CREATE POLICY "Members can insert creative metrics" ON public.creative_metrics FOR INSERT TO authenticated
  WITH CHECK (creative_id IN (
    SELECT cr.id FROM public.creatives cr
    JOIN public.workspace_members wm ON wm.workspace_id = cr.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- Automations
CREATE POLICY "Members can view automations" ON public.automations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert automations" ON public.automations FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update automations" ON public.automations FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete automations" ON public.automations FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Automation Runs
CREATE POLICY "Members can view automation runs" ON public.automation_runs FOR SELECT
  USING (automation_id IN (
    SELECT a.id FROM public.automations a
    JOIN public.workspace_members wm ON wm.workspace_id = a.workspace_id
    WHERE wm.user_id = auth.uid()
  ));
CREATE POLICY "Members can insert automation runs" ON public.automation_runs FOR INSERT TO authenticated
  WITH CHECK (automation_id IN (
    SELECT a.id FROM public.automations a
    JOIN public.workspace_members wm ON wm.workspace_id = a.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- Boards
CREATE POLICY "Members can view boards" ON public.boards FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert boards" ON public.boards FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update boards" ON public.boards FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete boards" ON public.boards FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Saved Ads
CREATE POLICY "Members can view saved ads" ON public.saved_ads FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert saved ads" ON public.saved_ads FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete saved ads" ON public.saved_ads FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Assets
CREATE POLICY "Members can view assets" ON public.assets FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert assets" ON public.assets FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update assets" ON public.assets FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete assets" ON public.assets FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Variations
CREATE POLICY "Members can view variations" ON public.variations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert variations" ON public.variations FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Credit Transactions
CREATE POLICY "Members can view credit transactions" ON public.credit_transactions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert credit transactions" ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Competitor Brands
CREATE POLICY "Members can view competitor brands" ON public.competitor_brands FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert competitor brands" ON public.competitor_brands FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update competitor brands" ON public.competitor_brands FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete competitor brands" ON public.competitor_brands FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Facebook Pages
CREATE POLICY "Members can view facebook pages" ON public.facebook_pages FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert facebook pages" ON public.facebook_pages FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update facebook pages" ON public.facebook_pages FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Comments
CREATE POLICY "Members can view comments" ON public.comments FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update comments" ON public.comments FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
