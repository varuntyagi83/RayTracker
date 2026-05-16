import { db } from "@/lib/db";
import { videoAnalyses, hooksMatrixRuns, downloadedMedia } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis";

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

// ─── Row mappers ─────────────────────────────────────────────────────────────

type VideoAnalysisRow = typeof videoAnalyses.$inferSelect;
type HooksMatrixRow = typeof hooksMatrixRuns.$inferSelect;

function rowToVideoAnalysis(row: VideoAnalysisRow): VideoAnalysisRecord {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    downloaded_media_id: row.downloadedMediaId,
    brand_name: row.brandName,
    video_url: row.videoUrl,
    provider: row.provider as 'gemini' | 'gpt4o',
    analysis_depth: row.analysisDepth as 'quick' | 'detailed',
    hook: (row.hook as VideoAnalysisResult['hook']) ?? null,
    narrative: (row.narrative as VideoAnalysisResult['narrative']) ?? null,
    cta: (row.cta as VideoAnalysisResult['cta']) ?? null,
    brand_elements: (row.brandElements as VideoAnalysisResult['brand_elements']) ?? null,
    text_overlays: (row.textOverlays as VideoAnalysisResult['text_overlays']) ?? null,
    competitive_insight: row.competitiveInsight,
    credits_used: row.creditsUsed,
    processing_status: row.processingStatus as 'pending' | 'analyzing' | 'completed' | 'failed',
    error_message: row.errorMessage,
    duration_ms: row.durationMs,
    created_at: row.createdAt.toISOString(),
  };
}

function rowToHooksMatrix(row: HooksMatrixRow): HooksMatrixRecord {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    competitor_brands: row.competitorBrands as string[],
    video_analysis_ids: row.videoAnalysisIds as string[],
    your_brand_name: row.yourBrandName,
    brand_guidelines_id: row.brandGuidelinesId,
    hook_count: row.hookCount,
    strategies: row.strategies as string[],
    result: row.result as import('@/lib/ai/hooks-generator').HooksMatrixResult | null,
    credits_used: row.creditsUsed,
    created_at: row.createdAt.toISOString(),
  };
}

// ─── Functions ───────────────────────────────────────────────────────────────

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
  const [inserted] = await db
    .insert(videoAnalyses)
    .values({
      workspaceId,
      downloadedMediaId: params.downloadedMediaId ?? null,
      brandName: params.brandName,
      videoUrl: params.videoUrl,
      provider: params.provider,
      analysisDepth: params.analysisDepth,
      processingStatus: 'analyzing',
    })
    .returning();

  if (!inserted) throw new Error('Failed to create video analysis');
  return rowToVideoAnalysis(inserted);
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
  const payload: Partial<typeof videoAnalyses.$inferInsert> = {
    processingStatus: update.status,
  };

  if (update.result) {
    payload.hook = update.result.hook ?? null;
    payload.narrative = update.result.narrative ?? null;
    payload.cta = update.result.cta ?? null;
    payload.brandElements = update.result.brand_elements ?? null;
    payload.textOverlays = update.result.text_overlays ?? null;
    payload.competitiveInsight = update.result.competitive_insight ?? null;
  }

  if (update.creditsUsed !== undefined) {
    payload.creditsUsed = update.creditsUsed;
  }

  if (update.durationMs !== undefined) {
    payload.durationMs = update.durationMs;
  }

  if (update.errorMessage !== undefined) {
    payload.errorMessage = update.errorMessage;
  }

  await db
    .update(videoAnalyses)
    .set(payload)
    .where(
      and(
        eq(videoAnalyses.id, id),
        eq(videoAnalyses.workspaceId, workspaceId)
      )
    );
}

export async function getVideoAnalysesByBrand(
  workspaceId: string,
  brandName: string
): Promise<VideoAnalysisRecord[]> {
  const rows = await db
    .select()
    .from(videoAnalyses)
    .where(
      and(
        eq(videoAnalyses.workspaceId, workspaceId),
        eq(videoAnalyses.brandName, brandName),
        eq(videoAnalyses.processingStatus, 'completed')
      )
    )
    .orderBy(desc(videoAnalyses.createdAt));

  return rows.map(rowToVideoAnalysis);
}

export async function getVideoAnalysisById(
  workspaceId: string,
  id: string
): Promise<VideoAnalysisRecord | null> {
  const [row] = await db
    .select()
    .from(videoAnalyses)
    .where(
      and(
        eq(videoAnalyses.id, id),
        eq(videoAnalyses.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!row) return null;
  return rowToVideoAnalysis(row);
}

export async function getDownloadedVideosByBrand(
  workspaceId: string,
  brandName?: string
): Promise<DownloadedVideoRecord[]> {
  const conditions = [
    eq(downloadedMedia.workspaceId, workspaceId),
    eq(downloadedMedia.mediaType, 'video'),
  ];

  if (brandName) {
    conditions.push(eq(downloadedMedia.brandName, brandName));
  }

  const rows = await db
    .select({
      id: downloadedMedia.id,
      brand_name: downloadedMedia.brandName,
      storage_url: downloadedMedia.storageUrl,
      thumbnail_url: downloadedMedia.thumbnailUrl,
      filename: downloadedMedia.filename,
      file_size: downloadedMedia.fileSize,
      created_at: downloadedMedia.createdAt,
    })
    .from(downloadedMedia)
    .where(and(...(conditions as [typeof conditions[0], ...typeof conditions])))
    .orderBy(desc(downloadedMedia.createdAt));

  return rows.map((row) => ({
    id: row.id,
    brand_name: row.brand_name,
    storage_url: row.storage_url,
    thumbnail_url: row.thumbnail_url,
    filename: row.filename,
    file_size: row.file_size,
    created_at: row.created_at.toISOString(),
  }));
}

export async function getVideoBrands(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ brandName: downloadedMedia.brandName })
    .from(downloadedMedia)
    .where(
      and(
        eq(downloadedMedia.workspaceId, workspaceId),
        eq(downloadedMedia.mediaType, 'video')
      )
    );

  const brands = Array.from(
    new Set(rows.map((row) => row.brandName))
  ).sort();

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
  const [inserted] = await db
    .insert(hooksMatrixRuns)
    .values({
      workspaceId,
      competitorBrands: params.competitorBrands,
      videoAnalysisIds: params.videoAnalysisIds,
      yourBrandName: params.yourBrandName,
      brandGuidelinesId: params.brandGuidelinesId ?? null,
      hookCount: params.hookCount,
      strategies: params.strategies,
      result: params.result,
      creditsUsed: params.creditsUsed,
    })
    .returning();

  if (!inserted) throw new Error('Failed to create hooks matrix run');
  return rowToHooksMatrix(inserted);
}

export async function getHooksMatrixRuns(
  workspaceId: string,
  limit = 10
): Promise<HooksMatrixRecord[]> {
  const rows = await db
    .select()
    .from(hooksMatrixRuns)
    .where(eq(hooksMatrixRuns.workspaceId, workspaceId))
    .orderBy(desc(hooksMatrixRuns.createdAt))
    .limit(limit);

  return rows.map(rowToHooksMatrix);
}
