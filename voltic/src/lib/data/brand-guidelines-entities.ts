import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BrandGuidelineEntity,
  BrandGuidelineInput,
  BrandGuidelineFile,
  ColorSwatch,
  Typography,
} from "@/types/brand-guidelines";

const STORAGE_BUCKET = "elements";

// ─── Slug Generation ────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─── Row to Entity ──────────────────────────────────────────────────────────

function rowToEntity(row: Record<string, unknown>): BrandGuidelineEntity {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    slug: row.slug as string,
    brandName: row.brand_name as string | null,
    brandVoice: row.brand_voice as string | null,
    colorPalette: (row.color_palette as ColorSwatch[]) ?? [],
    typography: (row.typography as Typography) ?? {},
    targetAudience: row.target_audience as string | null,
    dosAndDonts: row.dos_and_donts as string | null,
    logoUrl: row.logo_url as string | null,
    files: (row.files as BrandGuidelineFile[]) ?? [],
    isDefault: row.is_default as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── List ───────────────────────────────────────────────────────────────────

export async function listBrandGuidelines(
  workspaceId: string
): Promise<BrandGuidelineEntity[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToEntity);
}

// ─── Get By ID ──────────────────────────────────────────────────────────────

export async function getBrandGuidelineById(
  workspaceId: string,
  id: string
): Promise<BrandGuidelineEntity | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return rowToEntity(data);
}

// ─── Get By Slug ────────────────────────────────────────────────────────────

export async function getBrandGuidelineBySlug(
  workspaceId: string,
  slug: string
): Promise<BrandGuidelineEntity | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return rowToEntity(data);
}

// ─── Get Default ────────────────────────────────────────────────────────────

export async function getDefaultBrandGuideline(
  workspaceId: string
): Promise<BrandGuidelineEntity | null> {
  const supabase = createAdminClient();

  // Try is_default = true first
  const { data: defaultRow } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .single();

  if (defaultRow) return rowToEntity(defaultRow);

  // Fall back to most recently updated
  const { data: latest } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) return rowToEntity(latest);
  return null;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createBrandGuideline(
  workspaceId: string,
  input: BrandGuidelineInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const slug = generateSlug(input.name);

  // If setting as default, unset existing default
  if (input.isDefault) {
    await supabase
      .from("brand_guidelines")
      .update({ is_default: false })
      .eq("workspace_id", workspaceId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("brand_guidelines")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      slug,
      brand_name: input.brandName ?? null,
      brand_voice: input.brandVoice ?? null,
      color_palette: input.colorPalette ?? [],
      typography: input.typography ?? {},
      target_audience: input.targetAudience ?? null,
      dos_and_donts: input.dosAndDonts ?? null,
      is_default: input.isDefault ?? false,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateBrandGuideline(
  workspaceId: string,
  id: string,
  input: Partial<BrandGuidelineInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // If setting as default, unset existing default
  if (input.isDefault) {
    await supabase
      .from("brand_guidelines")
      .update({ is_default: false })
      .eq("workspace_id", workspaceId)
      .eq("is_default", true);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = generateSlug(input.name);
  }
  if (input.brandName !== undefined) updates.brand_name = input.brandName;
  if (input.brandVoice !== undefined) updates.brand_voice = input.brandVoice;
  if (input.colorPalette !== undefined) updates.color_palette = input.colorPalette;
  if (input.typography !== undefined) updates.typography = input.typography;
  if (input.targetAudience !== undefined) updates.target_audience = input.targetAudience;
  if (input.dosAndDonts !== undefined) updates.dos_and_donts = input.dosAndDonts;
  if (input.isDefault !== undefined) updates.is_default = input.isDefault;

  const { error } = await supabase
    .from("brand_guidelines")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteBrandGuideline(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Get the guideline to clean up storage files
  const guideline = await getBrandGuidelineById(workspaceId, id);
  if (!guideline) return { success: false, error: "Not found" };

  // Clean up logo
  if (guideline.logoUrl) {
    const logoPath = `${workspaceId}/${id}/logo`;
    await supabase.storage.from(STORAGE_BUCKET).remove([logoPath]);
  }

  // Clean up files
  if (guideline.files.length > 0) {
    const filePaths = guideline.files.map((f) => f.path);
    await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
  }

  const { error } = await supabase
    .from("brand_guidelines")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Set Default ────────────────────────────────────────────────────────────

export async function setDefaultBrandGuideline(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Unset existing default
  await supabase
    .from("brand_guidelines")
    .update({ is_default: false })
    .eq("workspace_id", workspaceId)
    .eq("is_default", true);

  // Set new default
  const { error } = await supabase
    .from("brand_guidelines")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Upload Logo ────────────────────────────────────────────────────────────

export async function uploadBrandGuidelineLogo(
  workspaceId: string,
  guidelineId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ url?: string; error?: string }> {
  const supabase = createAdminClient();
  const storagePath = `${workspaceId}/${guidelineId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // Update the guideline's logo_url
  await supabase
    .from("brand_guidelines")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", guidelineId)
    .eq("workspace_id", workspaceId);

  return { url: publicUrl };
}

// ─── Upload File ────────────────────────────────────────────────────────────

export async function uploadBrandGuidelineFile(
  workspaceId: string,
  guidelineId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
  fileSize: number
): Promise<{ file?: BrandGuidelineFile; error?: string }> {
  const supabase = createAdminClient();
  const storagePath = `${workspaceId}/${guidelineId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, { contentType });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  const newFile: BrandGuidelineFile = {
    name: fileName,
    url: publicUrl,
    path: storagePath,
    size: fileSize,
    type: contentType,
    uploadedAt: new Date().toISOString(),
  };

  // Add file to the guideline's files array
  const guideline = await getBrandGuidelineById(workspaceId, guidelineId);
  if (!guideline) return { error: "Guideline not found" };

  const updatedFiles = [...guideline.files, newFile];
  await supabase
    .from("brand_guidelines")
    .update({ files: updatedFiles, updated_at: new Date().toISOString() })
    .eq("id", guidelineId)
    .eq("workspace_id", workspaceId);

  return { file: newFile };
}

// ─── Upload Files (Batch) ────────────────────────────────────────────────────

export async function uploadBrandGuidelineFiles(
  workspaceId: string,
  guidelineId: string,
  files: Array<{
    fileName: string;
    fileBuffer: Buffer;
    contentType: string;
    fileSize: number;
  }>
): Promise<{ files: BrandGuidelineFile[]; errors: string[] }> {
  const supabase = createAdminClient();
  const errors: string[] = [];

  // Upload all files to storage in parallel
  const uploadResults = await Promise.all(
    files.map(async ({ fileName, fileBuffer, contentType, fileSize }) => {
      const storagePath = `${workspaceId}/${guidelineId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, { contentType });

      if (uploadError) {
        errors.push(`${fileName}: ${uploadError.message}`);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

      return {
        name: fileName,
        url: publicUrl,
        path: storagePath,
        size: fileSize,
        type: contentType,
        uploadedAt: new Date().toISOString(),
      } satisfies BrandGuidelineFile;
    })
  );

  const newFiles = uploadResults.filter((f): f is BrandGuidelineFile => f !== null);

  if (newFiles.length > 0) {
    // Single DB read + single DB write for all files
    const guideline = await getBrandGuidelineById(workspaceId, guidelineId);
    if (guideline) {
      const updatedFiles = [...guideline.files, ...newFiles];
      await supabase
        .from("brand_guidelines")
        .update({ files: updatedFiles, updated_at: new Date().toISOString() })
        .eq("id", guidelineId)
        .eq("workspace_id", workspaceId);
    }
  }

  return { files: newFiles, errors };
}

// ─── Delete File ────────────────────────────────────────────────────────────

export async function deleteBrandGuidelineFile(
  workspaceId: string,
  guidelineId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Remove from storage
  await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

  // Remove from files array
  const guideline = await getBrandGuidelineById(workspaceId, guidelineId);
  if (!guideline) return { success: false, error: "Guideline not found" };

  const updatedFiles = guideline.files.filter((f) => f.path !== filePath);
  await supabase
    .from("brand_guidelines")
    .update({ files: updatedFiles, updated_at: new Date().toISOString() })
    .eq("id", guidelineId)
    .eq("workspace_id", workspaceId);

  return { success: true };
}
