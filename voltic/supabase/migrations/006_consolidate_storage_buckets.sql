-- ============================================================================
-- 006_consolidate_storage_buckets.sql — Single "brand-assets" bucket for all storage
-- ============================================================================
-- All file storage now uses "brand-assets" bucket:
--   - Brand guideline files (logos, reference images)
--   - Product/background assets
--   - Generated ad composites
--   - Studio uploads & generated images
--   - Decomposed clean product images

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public read access (anyone can view via public URL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'brand_assets_public_read'
  ) THEN
    CREATE POLICY "brand_assets_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'brand-assets');
  END IF;
END $$;

-- 3. Authenticated users can upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'brand_assets_auth_insert'
  ) THEN
    CREATE POLICY "brand_assets_auth_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'brand-assets');
  END IF;
END $$;

-- 4. Authenticated users can update their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'brand_assets_auth_update'
  ) THEN
    CREATE POLICY "brand_assets_auth_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'brand-assets');
  END IF;
END $$;

-- 5. Authenticated users can delete their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'brand_assets_auth_delete'
  ) THEN
    CREATE POLICY "brand_assets_auth_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'brand-assets');
  END IF;
END $$;

-- 6. Unused buckets (elements, asset, ads) are left as-is.
-- Supabase prevents direct DELETE on storage.buckets via SQL (protect_delete trigger).
-- If cleanup is needed, use the Supabase Dashboard or Storage API.
