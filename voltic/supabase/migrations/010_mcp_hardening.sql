-- Phase 23 QA hardening: UPDATE RLS policy + media_type CHECK constraint

-- ─── UPDATE policy on mcp_api_keys (L-P23R-2) ────────────────────────────────
-- toggle (is_active) and last_used_at updates use the admin/service-role client
-- which bypasses RLS, but this policy makes the table defensively complete.

CREATE POLICY "Members can update mcp api keys" ON public.mcp_api_keys
  FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ─── CHECK constraint on downloaded_media.media_type (L-P23R-3) ──────────────

ALTER TABLE public.downloaded_media
  ADD CONSTRAINT downloaded_media_media_type_check
  CHECK (media_type IN ('image', 'video'));
