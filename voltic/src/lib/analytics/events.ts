/**
 * Typed PostHog event definitions for Voltic.
 *
 * Every client-side event uses `track()` which wraps `posthog.capture()`.
 * Every server-side event uses `trackServer()` which wraps `posthog-node`.
 *
 * Adding a new event? Add it to EventPropertiesMap, then track() / trackServer()
 * will enforce the correct properties at compile time.
 */

// ─── Event → Properties Map ───────────────────────────────────────────────

export interface EventPropertiesMap {
  // Auth
  signup_started: Record<string, never>;
  signup_completed: { method: string };
  login_submitted: { method: string };
  login_failed: { method: string; error: string };

  // Dashboard
  dashboard_loaded: { ad_account_count: number };
  top_assets_tab_switched: { tab: string };

  // Sidebar & Nav
  sidebar_nav_clicked: { destination: string; current_page: string };
  user_logged_out: Record<string, never>;
  refresh_clicked: Record<string, never>;

  // Automations
  automations_page_viewed: { count: number };
  automation_created: { type: string; status: string; [key: string]: unknown };
  automation_updated: { automation_id: string };
  automation_deleted: { automation_id: string };
  automation_activated: { automation_id: string };
  automation_paused: { automation_id: string };
  automation_test_run: { automation_id: string; success: boolean };
  automation_filter_changed: { filter: string };
  automation_wizard_step_completed: {
    step: string;
    step_number: number;
    wizard_type?: string;
  };
  automation_wizard_abandoned: { step: string; wizard_type?: string };
  create_automation_clicked: { type: string };
  comment_automation_created: { status: string; page_count: number; frequency: string };
  competitor_automation_created: { status: string; brand_name: string; top_n: number };

  // Discover
  discover_search_executed: { query: string; result_count: number };
  discover_ad_saved_to_board: { board_id: string; ad_id: string };
  discover_ad_analyzed: { ad_id: string };
  discover_ads_compared: { ad_count: number };
  discover_format_filtered: { format: string };
  discover_run_saved: { run_id: string; ad_count: number };

  // Boards
  board_created: { board_id: string; name: string };
  board_updated: { board_id: string };
  board_deleted: { board_id: string };
  board_ad_removed: { board_id: string; ad_id: string };
  board_variation_opened: { ad_id: string };
  board_ad_analyzed: { ad_id: string; cached: boolean };
  board_creative_builder_opened: { ad_id: string };

  // Assets
  asset_created: { asset_id: string; name: string };
  asset_updated: { asset_id: string };
  asset_deleted: { asset_id: string };

  // Creative Builder
  creative_builder_images_added: { count: number };
  creative_builder_texts_added: { count: number };
  creative_builder_enhance_clicked: { combination_count: number; credit_cost: number };
  creative_builder_enhance_completed: { combination_count: number; success_count: number };

  // Creative Studio
  studio_conversation_created: { conversation_id: string };
  studio_message_sent: { conversation_id: string; model: string };
  studio_model_changed: { model: string; previous_model: string };
  studio_generation_saved_as_asset: {
    conversation_id: string;
    asset_name: string;
  };
  studio_conversation_deleted: { conversation_id: string };

  // Brand Guidelines
  brand_guideline_created: { guideline_id: string };
  brand_guideline_updated: { guideline_id: string };
  brand_guideline_deleted: { guideline_id: string };

  // Competitors
  competitor_report_generated: { report_id: string; brand_count: number };
  competitor_report_deleted: { report_id: string };
  competitor_brands_deleted: { brand_ids: string[] };

  // Reports
  report_viewed: { report_type: string };
  report_exported: { report_type: string; format: string };
  report_date_range_changed: { range: string };

  // Campaign Analysis
  campaign_analysis_viewed: { report_type: string };

  // Settings
  settings_updated: { section: string };
  api_token_copied: Record<string, never>;

  // Meta Connection
  meta_connect_initiated: Record<string, never>;
  meta_connected: { ad_account_count: number };
  meta_connect_failed: { error: string };
  meta_disconnected: Record<string, never>;
  meta_ad_accounts_synced: { account_count: number };
  meta_campaigns_synced: { workspace_id: string; ad_account_id: string; campaign_count: number };

  // Extension (server-side)
  extension_auth_validated: { workspace_id: string };
  extension_ad_saved: {
    workspace_id: string;
    board_id: string;
    duplicate: boolean;
  };

  // Cron (server-side)
  automation_cron_executed: {
    total: number;
    executed: number;
  };
  automation_cron_error: { error: string };

  // Variations Page
  variations_page_viewed: Record<string, never>;
  variation_generated_from_page: { saved_ad_id: string; asset_id: string; strategies: number; channel: string };
  variation_deleted_from_history: { variation_id: string };

  // Ad Decomposition
  ad_decomposition_started: { source_type: string; source_id?: string; generate_clean_image: boolean };
  ad_decomposition_completed: { decomposition_id: string; texts_found: number; product_detected: boolean; duration_ms: number; credits_used: number };
  ad_decomposition_failed: { decomposition_id?: string; error: string };
  ad_decomposition_batch_started: { count: number; total_credits: number };
  decomposition_saved_as_asset: { decomposition_id: string; asset_id: string; has_clean_image: boolean };

  // Decomposition UI
  decomposition_modal_opened: { source: "board" | "discover" | "decomposition"; ad_id: string };
  decomposition_comparison_toggled: { decomposition_id: string; showing: "original" | "clean" };
  decomposition_text_edited: { decomposition_id: string; text_type: string };
  decomposition_sent_to_builder: { decomposition_id: string; image_count: number; text_count: number };
  decomposition_asset_saved: { decomposition_id: string; asset_id: string };
  decomposition_page_viewed: Record<string, never>;
  decomposition_image_uploaded: { file_name: string };

  // AI / Credits (server-side)
  credits_deducted: {
    workspace_id: string;
    amount: number;
    reason: string;
  };
  credits_refunded: {
    workspace_id: string;
    amount: number;
    reason: string;
  };

  // Credits UI
  credits_page_viewed: Record<string, never>;
  credits_purchased: {
    package_id: string;
    credits: number;
    workspace_id?: string;
    stripe_session_id?: string;
    amount?: number;
  };
  credits_purchase_clicked: { package_id: string };
  credit_balance_clicked: Record<string, never>;
  insufficient_credits_shown: {
    feature: string;
    needed: number;
    have: number;
  };
}

// ─── Event Name Union ─────────────────────────────────────────────────────

export type VolticEvent = keyof EventPropertiesMap;

// ─── Client-Side Typed Track ──────────────────────────────────────────────

import { trackEvent } from "./posthog-provider";

/**
 * Type-safe client-side event tracking.
 * Wraps the existing `trackEvent()` with compile-time enforcement of
 * event name → required properties.
 */
export function track<E extends VolticEvent>(
  event: E,
  ...args: Record<string, never> extends EventPropertiesMap[E]
    ? [properties?: EventPropertiesMap[E]]
    : [properties: EventPropertiesMap[E]]
): void {
  trackEvent(event, args[0] as Record<string, unknown> | undefined);
}
