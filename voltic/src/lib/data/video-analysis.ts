import { createAdminClient } from "@/lib/supabase/admin";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export interface VideoAnalysisRecord {
  id: string;
  workspace_id: string;
  downloaded_media_id: string | null;
  brand_name: string;
  video_url: string;
  provider: 'gemini' | 'gpt4o';
  analysis_depth: 'quick' | 'detailed';
  hook: VideoAnalysisResult['hook'] | null;
  narrative: VideoAnalysisResult['narrative'] | null;
  cta: VideoAnalysisResult['cta'] | null;
  brand_elements: VideoAnalysisResult['brand_elements'] | null;
  text_overlays: VideoAnalysisResult['text_overlays'] | null;
  competitive_insight: string | null;
  credits_used: number;
  processing_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface HooksMatrixRecord {
  id: string;
  workspace_id: string;
  competitor_brands: string[];
  video_analysis_ids: string[];
  your_brand_name: string;
  brand_guidelines_id: string | null;
  hook_count: number;
  strategies: string[];
  result: import('@/lib/ai/hooks-generator').HooksMatrixResult | null;
  credits_used: number;
  created_at: string;
}

export interface DownloadedVideoRecord {
  id: string;
  brand_name: string;
  storage_url: string;
  thumbnail_url: string | null;
  filename: string;
  file_size: number;
  created_at: string;
}

export async function createVideoAnalysis(
  workspaceId: string,
  params: {
    downloadedMediaId?: string;
    brandName: string;
    videoUrl: string;
    provider: 'gemini' | 'gpt4o';
    analysisDepth: 'quick' | 'detailed';
  }
): Promise<VideoAnalysisRecord> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('video_analyses')
    .insert({
      workspace_id: workspaceId,
      downloaded_media_id: params.downloadedMediaId ?? null,
      brand_name: params.brandName,
      video_url: params.videoUrl,
      provider: params.provider,
      analysis_depth: params.analysisDepth,
      processing_status: 'analyzing',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create video analysis: ${error.message}`);
  return data as VideoAnalysisRecord;
}

export async function updateVideoAnalysis(
  id: string,
  workspaceId: string,
  update: {
    result?: VideoAnalysisResult;
    status: 'completed' | 'failed';
    creditsUsed?: number;
    durationMs?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const payload: Record<string, unknown> = {
    processing_status: update.status,
  };

  if (update.result) {
    payload.hook = update.result.hook ?? null;
    payload.narrative = update.result.narrative ?? null;
    payload.cta = update.result.cta ?? null;
    payload.brand_elements = update.result.brand_elements ?? null;
    payload.text_overlays = update.result.text_overlays ?? null;
    payload.competitive_insight = update.result.competitive_insight ?? null;
  }

  if (update.creditsUsed !== undefined) {
    payload.credits_used = update.creditsUsed;
  }

  if (update.durationMs !== undefined) {
    payload.duration_ms = update.durationMs;
  }

  if (update.errorMessage !== undefined) {
    payload.error_message = update.errorMessage;
  }

  const { error } = await supabase
    .from('video_analyses')
    .update(payload)
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(`Failed to update video analysis: ${error.message}`);
}

export async function getVideoAnalysesByBrand(
  workspaceId: string,
  brandName: string
): Promise<VideoAnalysisRecord[]> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_name', brandName)
    .eq('processing_status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get video analyses by brand: ${error.message}`);
  return (data ?? []) as VideoAnalysisRecord[];
}

export async function getVideoAnalysisById(
  workspaceId: string,
  id: string
): Promise<VideoAnalysisRecord | null> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get video analysis: ${error.message}`);
  }

  return data as VideoAnalysisRecord;
}

export async function getDownloadedVideosByBrand(
  workspaceId: string,
  brandName?: string
): Promise<DownloadedVideoRecord[]> {
  const supabase = createAdminClient() as AnySupabaseClient;

  let query = supabase
    .from('downloaded_media')
    .select('id, brand_name, storage_url, thumbnail_url, filename, file_size, created_at')
    .eq('workspace_id', workspaceId)
    .eq('media_type', 'video')
    .order('created_at', { ascending: false });

  if (brandName) {
    query = query.eq('brand_name', brandName);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get downloaded videos: ${error.message}`);
  return (data ?? []) as DownloadedVideoRecord[];
}

export async function getVideoBrands(workspaceId: string): Promise<string[]> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('downloaded_media')
    .select('brand_name')
    .eq('workspace_id', workspaceId)
    .eq('media_type', 'video');

  if (error) throw new Error(`Failed to get video brands: ${error.message}`);

  const brands = Array.from(
    new Set((data ?? []).map((row: { brand_name: string }) => row.brand_name))
  ).sort() as string[];

  return brands;
}

export async function createHooksMatrixRun(
  workspaceId: string,
  params: {
    competitorBrands: string[];
    videoAnalysisIds: string[];
    yourBrandName: string;
    brandGuidelinesId?: string;
    hookCount: number;
    strategies: string[];
    result: import('@/lib/ai/hooks-generator').HooksMatrixResult;
    creditsUsed: number;
  }
): Promise<HooksMatrixRecord> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('hooks_matrix_runs')
    .insert({
      workspace_id: workspaceId,
      competitor_brands: params.competitorBrands,
      video_analysis_ids: params.videoAnalysisIds,
      your_brand_name: params.yourBrandName,
      brand_guidelines_id: params.brandGuidelinesId ?? null,
      hook_count: params.hookCount,
      strategies: params.strategies,
      result: params.result,
      credits_used: params.creditsUsed,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create hooks matrix run: ${error.message}`);
  return data as HooksMatrixRecord;
}

export async function getHooksMatrixRuns(
  workspaceId: string,
  limit = 10
): Promise<HooksMatrixRecord[]> {
  const supabase = createAdminClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('hooks_matrix_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get hooks matrix runs: ${error.message}`);
  return (data ?? []) as HooksMatrixRecord[];
}
