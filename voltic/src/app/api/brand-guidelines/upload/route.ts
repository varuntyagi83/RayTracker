import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  uploadBrandGuidelineLogo,
  uploadBrandGuidelineFiles,
} from "@/lib/data/brand-guidelines-entities";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

export async function POST(req: NextRequest) {
  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const guidelineId = formData.get("guidelineId") as string;
  const uploadType = formData.get("type") as string; // "files" | "logo"

  if (!guidelineId) {
    return NextResponse.json(
      { error: "Guideline ID is required" },
      { status: 400 }
    );
  }

  // ── Logo Upload ──────────────────────────────────────────────────────────
  if (uploadType === "logo") {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: "Logo must be under 5MB" },
        { status: 400 }
      );
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, and SVG images are allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBrandGuidelineLogo(
      workspace.id,
      guidelineId,
      file.name,
      buffer,
      file.type
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ url: result.url });
  }

  // ── Batch File Upload ────────────────────────────────────────────────────
  const rawFiles = formData.getAll("files") as File[];
  if (rawFiles.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Validate all files upfront
  for (const file of rawFiles) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `${file.name} exceeds 20MB limit` },
        { status: 400 }
      );
    }
  }

  // Convert all files to buffers in parallel
  const fileEntries = await Promise.all(
    rawFiles.map(async (file) => ({
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      fileSize: file.size,
    }))
  );

  const result = await uploadBrandGuidelineFiles(
    workspace.id,
    guidelineId,
    fileEntries
  );

  return NextResponse.json({
    files: result.files,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
}
