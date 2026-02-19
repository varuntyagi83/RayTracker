-- 007_variations_asset_source.sql — Support asset-based variation generation
-- Run this in Supabase Dashboard SQL Editor

-- 1. Make saved_ad_id nullable (allow asset-only variations)
ALTER TABLE public.variations ALTER COLUMN saved_ad_id DROP NOT NULL;

-- 2. Add source discriminator column
ALTER TABLE public.variations ADD COLUMN source TEXT NOT NULL DEFAULT 'competitor';

-- 3. Add creative options for asset-based modifications (angle, lighting, background, custom)
ALTER TABLE public.variations ADD COLUMN creative_options JSONB;

-- 4. Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_variations_source ON public.variations(source);
