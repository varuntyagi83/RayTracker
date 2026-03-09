import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

function verifyMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimeType === "image/webp") {
    return buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
  }
  if (mimeType === "image/gif") {
    const sig = buf.slice(0, 6).toString("ascii");
    return sig === "GIF87a" || sig === "GIF89a";
  }
  if (mimeType === "application/pdf") {
    return buf.slice(0, 4).toString("ascii") === "%PDF";
  }
  // Unknown type — reject
  return false;
}
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_REQUEST_SIZE = MAX_FILES * MAX_FILE_SIZE; // 50MB hard cap for full request

export async function POST(req: NextRequest) {
  // Reject oversized requests before reading the body into memory.
  // This prevents DoS via huge multipart uploads that exhaust server RAM.
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
    return NextResponse.json(
      { error: "Request too large — maximum total upload size is 50MB" },
      { status: 413 }
    );
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} files allowed` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const uploaded: { url: string; name: string; type: string; size: number }[] =
    [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds 10MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Defense-in-depth: verify actual byte count (Content-Length is client-supplied
    // and spoofable — this checks the real size after reading) (L-9 fix)
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds 10MB limit` },
        { status: 413 }
      );
    }

    if (!verifyMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal and special-char storage issues
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const storagePath = `${workspace.id}/studio/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("brand-assets").getPublicUrl(storagePath);

    uploaded.push({
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  }

  return NextResponse.json({ files: uploaded });
}
