import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ─── R2 Client (singleton) ────────────────────────────────────────────────────

let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local"
      );
    }

    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _r2Client;
}

export interface DownloadResult {
  storage_url: string;
  thumbnail_url: string | null;
  file_size: number;
  filename: string;
}

export interface BatchDownloadResult {
  total: number;
  downloaded: number;
  failed: number;
  files: Array<{ filename: string; storage_url: string; size: number }>;
  errors: Array<{ index: number; error: string }>;
}

/**
 * Validates that a URL is safe to fetch: must be HTTPS and must not point to
 * private/internal IP ranges or localhost.
 */
function isPublicUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (hostname === "localhost") return false;

  // Block IPv6 private/link-local ranges
  if (hostname.startsWith("[") || hostname.includes(":")) {
    // Strip surrounding brackets for IPv6 literal URLs
    const ipv6 = hostname.replace(/^\[|\]$/g, "").toLowerCase();
    // Loopback
    if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return false;
    // Unique Local Address fc00::/7 (starts with fc or fd)
    if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return false;
    // Link-local fe80::/10 (starts with fe8, fe9, fea, feb)
    if (ipv6.startsWith("fe8") || ipv6.startsWith("fe9") ||
        ipv6.startsWith("fea") || ipv6.startsWith("feb")) return false;
    // Unspecified / loopback short forms
    if (ipv6 === "::" || ipv6 === "0::") return false;
  }

  // Block by hostname patterns for common internal names
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return false;
  }

  // Parse IPv4 addresses
  const ipv4Parts = hostname.split(".");
  if (ipv4Parts.length === 4) {
    const octets = ipv4Parts.map(Number);
    if (octets.every((o) => !isNaN(o) && o >= 0 && o <= 255)) {
      const [a, b, c] = octets;

      // 127.x.x.x — loopback
      if (a === 127) return false;

      // 10.x.x.x — RFC 1918
      if (a === 10) return false;

      // 192.168.x.x — RFC 1918
      if (a === 192 && b === 168) return false;

      // 172.16.x.x – 172.31.x.x — RFC 1918
      if (a === 172 && b >= 16 && b <= 31) return false;

      // 169.254.x.x — link-local / AWS metadata
      if (a === 169 && b === 254) return false;
    }
  }

  return true;
}

function sanitizeBrandName(brandName: string): string {
  return brandName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
}

function getExtensionFromContentType(
  contentType: string,
  mediaType: "image" | "video"
): string {
  const ct = contentType.split(";")[0].trim().toLowerCase();

  switch (ct) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    case "video/webm":
      return ".webm";
    default:
      return mediaType === "video" ? ".mp4" : ".jpg";
  }
}

export async function downloadAndStoreMedia(params: {
  mediaUrl: string;
  workspaceId: string;
  brandName: string;
  mediaType: "image" | "video";
  adIndex?: number;
  metadata?: Record<string, unknown>;
}): Promise<DownloadResult> {
  const { mediaUrl, workspaceId, brandName, mediaType, adIndex = 0, metadata } =
    params;

  if (!isPublicUrl(mediaUrl)) {
    throw new Error(`URL is not a safe public HTTPS URL: ${mediaUrl}`);
  }

  const timeoutMs = mediaType === "video" ? 120_000 : 30_000;

  const response = await fetch(mediaUrl, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch media: HTTP ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  // Validate Content-Type roughly matches expected media type
  if (mediaType === "image" && !contentType.startsWith("image/")) {
    throw new Error(
      `Expected image Content-Type, got: ${contentType}`
    );
  }
  if (mediaType === "video" && !contentType.startsWith("video/")) {
    throw new Error(
      `Expected video Content-Type, got: ${contentType}`
    );
  }

  const buffer = await response.arrayBuffer();

  // Cap file sizes: 25 MB for images, 100 MB for videos
  const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
  if (mediaType === "image" && buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds 25 MB limit (got ${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB)`
    );
  }
  if (mediaType === "video" && buffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video exceeds 100 MB limit (got ${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB)`
    );
  }

  const ext = getExtensionFromContentType(contentType, mediaType);
  const safeBrand = sanitizeBrandName(brandName);
  const filename = `${safeBrand}_${adIndex}${ext}`;
  const storagePath = `${workspaceId}/${safeBrand}/${filename}`;

  // ── Upload to Cloudflare R2 ──────────────────────────────────────────────
  const r2 = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME ?? "competitor-media";
  const publicUrlBase = process.env.R2_PUBLIC_URL ?? "";

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: Buffer.from(buffer),
      ContentType: contentType,
    })
  );

  const storage_url = `${publicUrlBase}/${storagePath}`;

  const admin = createAdminClient() as AnySupabaseClient;

  const { error: insertError } = await admin.from("downloaded_media").insert({
    workspace_id: workspaceId,
    brand_name: brandName,
    original_url: mediaUrl,
    storage_url,
    thumbnail_url: null,
    media_type: mediaType,
    file_size: buffer.byteLength,
    filename,
    metadata: metadata ?? {},
  });

  if (insertError) {
    // Roll back the R2 upload to avoid orphaned files
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucketName, Key: storagePath }));
    } catch (deleteErr) {
      console.error("[download] Failed to delete orphaned R2 object:", deleteErr);
    }
    throw new Error(`DB insert failed: ${(insertError as { message: string }).message}`);
  }

  return {
    storage_url,
    thumbnail_url: null,
    file_size: buffer.byteLength,
    filename,
  };
}

export async function downloadBatchMedia(params: {
  workspaceId: string;
  brandName: string;
  ads: Array<{ mediaUrl: string; mediaType: string; title?: string }>;
  maxConcurrent?: number;
}): Promise<BatchDownloadResult> {
  const { workspaceId, brandName, ads, maxConcurrent = 5 } = params;

  const result: BatchDownloadResult = {
    total: ads.length,
    downloaded: 0,
    failed: 0,
    files: [],
    errors: [],
  };

  // Process in parallel batches (chunk-based)
  for (let chunkStart = 0; chunkStart < ads.length; chunkStart += maxConcurrent) {
    const chunk = ads.slice(chunkStart, chunkStart + maxConcurrent);

    const chunkResults = await Promise.allSettled(
      chunk.map((ad, chunkIndex) => {
        const globalIndex = chunkStart + chunkIndex;
        const mediaType: "image" | "video" =
          ad.mediaType.startsWith("video") ? "video" : "image";

        return downloadAndStoreMedia({
          mediaUrl: ad.mediaUrl,
          workspaceId,
          brandName,
          mediaType,
          adIndex: globalIndex,
        }).then((downloadResult) => ({ globalIndex, downloadResult }));
      })
    );

    for (const settled of chunkResults) {
      if (settled.status === "fulfilled") {
        const { downloadResult } = settled.value;
        result.downloaded += 1;
        result.files.push({
          filename: downloadResult.filename,
          storage_url: downloadResult.storage_url,
          size: downloadResult.file_size,
        });
      } else {
        result.failed += 1;
        // Recover the index from the error if possible; otherwise track generically
        const chunkIndex = chunkResults.indexOf(settled);
        const globalIndex = chunkStart + chunkIndex;
        result.errors.push({
          index: globalIndex,
          error:
            settled.reason instanceof Error
              ? settled.reason.message
              : String(settled.reason),
        });
      }
    }
  }

  return result;
}
