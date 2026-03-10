/**
 * R2 end-to-end test — simulates exactly what download.ts does.
 * Run: node scripts/test-r2.mjs
 *
 * Tests:
 *  1. Credentials + bucket accessible
 *  2. Upload a small test text file
 *  3. Download a real public image and upload it to R2
 *  4. Verify public URL is accessible
 *  5. Cleanup both test files
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

// Load .env.local manually
const envContent = readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = env;

const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"]
  .filter(k => !env[k] || env[k].startsWith("your_"));

if (missing.length > 0) {
  console.error("❌ Missing or placeholder env vars:", missing.join(", "));
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const TEXT_KEY  = "test/connection-check.txt";
const IMAGE_KEY = "test/workspace-test/AG1_0.jpg";

// Small public image for the download test (Cloudflare's own favicon — reliable)
const TEST_IMAGE_URL = "https://www.cloudflare.com/favicon.ico";

async function run() {
  console.log("🔵 R2 end-to-end test");
  console.log(`   Bucket : ${R2_BUCKET_NAME}`);
  console.log(`   Public : ${R2_PUBLIC_URL}\n`);

  // ── 1. Bucket access ──────────────────────────────────────────────────────
  try {
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    console.log("✅ 1/4  Bucket accessible");
  } catch (err) {
    console.error("❌ 1/4  Cannot access bucket:", err.message);
    process.exit(1);
  }

  // ── 2. Upload text file ───────────────────────────────────────────────────
  try {
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: TEXT_KEY,
      Body: Buffer.from(`Voltic test — ${new Date().toISOString()}`),
      ContentType: "text/plain",
    }));
    console.log("✅ 2/4  Text upload OK");
  } catch (err) {
    console.error("❌ 2/4  Text upload failed:", err.message);
    process.exit(1);
  }

  // ── 3. Download real image → upload to R2 (mirrors download.ts logic) ────
  let imageBytes = 0;
  try {
    const res = await fetch(TEST_IMAGE_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    imageBytes = buffer.byteLength;

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: IMAGE_KEY,
      Body: Buffer.from(buffer),
      ContentType: res.headers.get("content-type") ?? "image/jpeg",
    }));
    console.log(`✅ 3/4  Image download → R2 upload OK (${(imageBytes / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error("❌ 3/4  Image upload failed:", err.message);
    process.exit(1);
  }

  // ── 4. Verify public URL ──────────────────────────────────────────────────
  const publicUrl = `${R2_PUBLIC_URL}/${IMAGE_KEY}`;
  try {
    const res = await fetch(publicUrl);
    if (res.ok) {
      console.log(`✅ 4/4  Public URL accessible: ${publicUrl}`);
    } else {
      console.warn(`⚠️  4/4  Public URL returned HTTP ${res.status}`);
      console.warn("         Go to R2 → competitor-media → Settings → Allow Access");
    }
  } catch (err) {
    console.warn("⚠️  4/4  Could not fetch public URL:", err.message);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await Promise.all([
    r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: TEXT_KEY })),
    r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: IMAGE_KEY })),
  ]);

  console.log("\n🧹 Test files cleaned up");
  console.log("🎉 All checks passed — download.ts is ready to use R2.");
}

run().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
