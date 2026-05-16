import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BRAND_ASSETS_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_BRAND_ASSETS_PUBLIC_URL!;

export async function uploadBrandAsset(
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${path}`;
}

export async function deleteBrandAsset(path: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: path,
    })
  );
}

export function getBrandAssetUrl(path: string): string {
  return `${PUBLIC_URL}/${path}`;
}
