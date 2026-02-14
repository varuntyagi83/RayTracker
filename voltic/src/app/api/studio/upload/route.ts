import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export async function POST(req: NextRequest) {
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
    const storagePath = `${workspace.id}/studio/${Date.now()}-${file.name}`;

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
