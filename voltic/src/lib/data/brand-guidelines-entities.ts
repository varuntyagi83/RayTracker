import { uploadBrandAsset, deleteBrandAsset } from "@/lib/storage/brand-assets";
import { db } from "@/lib/db";
import { brandGuidelinesTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  BrandGuidelineEntity,
  BrandGuidelineInput,
  BrandGuidelineFile,
  ColorSwatch,
  Typography,
} from "@/types/brand-guidelines";

// ─── Slug Generation ────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─── Row to Entity ──────────────────────────────────────────────────────────

type BrandGuidelineRow = typeof brandGuidelinesTable.$inferSelect;

function rowToEntity(row: BrandGuidelineRow): BrandGuidelineEntity {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    brandName: row.brandName,
    brandVoice: row.brandVoice,
    colorPalette: (row.colorPalette as ColorSwatch[]) ?? [],
    typography: (row.typography as Typography) ?? {},
    targetAudience: row.targetAudience,
    dosAndDonts: row.dosAndDonts,
    logoUrl: row.logoUrl,
    files: (row.files as BrandGuidelineFile[]) ?? [],
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── List ───────────────────────────────────────────────────────────────────

export async function listBrandGuidelines(
  workspaceId: string
): Promise<BrandGuidelineEntity[]> {
  const rows = await db
    .select()
    .from(brandGuidelinesTable)
    .where(eq(brandGuidelinesTable.workspaceId, workspaceId))
    .orderBy(desc(brandGuidelinesTable.updatedAt));

  return rows.map(rowToEntity);
}

// ─── Get By ID ──────────────────────────────────────────────────────────────

export async function getBrandGuidelineById(
  workspaceId: string,
  id: string
): Promise<BrandGuidelineEntity | null> {
  const [row] = await db
    .select()
    .from(brandGuidelinesTable)
    .where(
      and(
        eq(brandGuidelinesTable.workspaceId, workspaceId),
        eq(brandGuidelinesTable.id, id)
      )
    )
    .limit(1);

  if (!row) return null;
  return rowToEntity(row);
}

// ─── Get By Slug ────────────────────────────────────────────────────────────

export async function getBrandGuidelineBySlug(
  workspaceId: string,
  slug: string
): Promise<BrandGuidelineEntity | null> {
  const [row] = await db
    .select()
    .from(brandGuidelinesTable)
    .where(
      and(
        eq(brandGuidelinesTable.workspaceId, workspaceId),
        eq(brandGuidelinesTable.slug, slug)
      )
    )
    .limit(1);

  if (!row) return null;
  return rowToEntity(row);
}

// ─── Get Default ────────────────────────────────────────────────────────────

export async function getDefaultBrandGuideline(
  workspaceId: string
): Promise<BrandGuidelineEntity | null> {
  // Try is_default = true first
  const [defaultRow] = await db
    .select()
    .from(brandGuidelinesTable)
    .where(
      and(
        eq(brandGuidelinesTable.workspaceId, workspaceId),
        eq(brandGuidelinesTable.isDefault, true)
      )
    )
    .limit(1);

  if (defaultRow) return rowToEntity(defaultRow);

  // Fall back to most recently updated
  const [latest] = await db
    .select()
    .from(brandGuidelinesTable)
    .where(eq(brandGuidelinesTable.workspaceId, workspaceId))
    .orderBy(desc(brandGuidelinesTable.updatedAt))
    .limit(1);

  if (latest) return rowToEntity(latest);
  return null;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createBrandGuideline(
  workspaceId: string,
  input: BrandGuidelineInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const slug = generateSlug(input.name);

  try {
    // If setting as default, unset existing default
    if (input.isDefault) {
      await db
        .update(brandGuidelinesTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(brandGuidelinesTable.workspaceId, workspaceId),
            eq(brandGuidelinesTable.isDefault, true)
          )
        );
    }

    const [inserted] = await db
      .insert(brandGuidelinesTable)
      .values({
        workspaceId,
        name: input.name,
        slug,
        brandName: input.brandName ?? null,
        brandVoice: input.brandVoice ?? null,
        colorPalette: input.colorPalette ?? [],
        typography: input.typography ?? {},
        targetAudience: input.targetAudience ?? null,
        dosAndDonts: input.dosAndDonts ?? null,
        isDefault: input.isDefault ?? false,
      })
      .returning({ id: brandGuidelinesTable.id });

    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateBrandGuideline(
  workspaceId: string,
  id: string,
  input: Partial<BrandGuidelineInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    // If setting as default, unset existing default
    if (input.isDefault) {
      await db
        .update(brandGuidelinesTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(brandGuidelinesTable.workspaceId, workspaceId),
            eq(brandGuidelinesTable.isDefault, true)
          )
        );
    }

    const updates: Partial<typeof brandGuidelinesTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) {
      updates.name = input.name;
      updates.slug = generateSlug(input.name);
    }
    if (input.brandName !== undefined) updates.brandName = input.brandName;
    if (input.brandVoice !== undefined) updates.brandVoice = input.brandVoice;
    if (input.colorPalette !== undefined) updates.colorPalette = input.colorPalette;
    if (input.typography !== undefined) updates.typography = input.typography;
    if (input.targetAudience !== undefined) updates.targetAudience = input.targetAudience;
    if (input.dosAndDonts !== undefined) updates.dosAndDonts = input.dosAndDonts;
    if (input.isDefault !== undefined) updates.isDefault = input.isDefault;

    await db
      .update(brandGuidelinesTable)
      .set(updates)
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          eq(brandGuidelinesTable.id, id)
        )
      );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteBrandGuideline(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Get the guideline to clean up storage files
  const guideline = await getBrandGuidelineById(workspaceId, id);
  if (!guideline) return { success: false, error: "Not found" };

  // Clean up logo
  if (guideline.logoUrl) {
    const logoPath = `${workspaceId}/guidelines/${id}/logo`;
    await deleteBrandAsset(logoPath).catch(() => {});
  }

  // Clean up files
  if (guideline.files.length > 0) {
    await Promise.all(
      guideline.files.map((f) => deleteBrandAsset(f.path).catch(() => {}))
    );
  }

  try {
    await db
      .delete(brandGuidelinesTable)
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          eq(brandGuidelinesTable.id, id)
        )
      );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Set Default ────────────────────────────────────────────────────────────

export async function setDefaultBrandGuideline(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Unset existing default
    await db
      .update(brandGuidelinesTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          eq(brandGuidelinesTable.isDefault, true)
        )
      );

    // Set new default
    await db
      .update(brandGuidelinesTable)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(brandGuidelinesTable.workspaceId, workspaceId),
          eq(brandGuidelinesTable.id, id)
        )
      );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Upload Logo ────────────────────────────────────────────────────────────

export async function uploadBrandGuidelineLogo(
  workspaceId: string,
  guidelineId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ url?: string; error?: string }> {
  // Sanitize filename — same pattern as studio/asset uploads (H-27)
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${workspaceId}/guidelines/${guidelineId}/${Date.now()}-${safeFileName}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadBrandAsset(storagePath, fileBuffer, contentType);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

  // Update the guideline's logo_url
  await db
    .update(brandGuidelinesTable)
    .set({ logoUrl: publicUrl, updatedAt: new Date() })
    .where(
      and(
        eq(brandGuidelinesTable.id, guidelineId),
        eq(brandGuidelinesTable.workspaceId, workspaceId)
      )
    );

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
  // Sanitize filename — same pattern as studio/asset uploads (H-27)
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${workspaceId}/guidelines/${guidelineId}/${Date.now()}-${safeFileName}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadBrandAsset(storagePath, fileBuffer, contentType);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

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
  await db
    .update(brandGuidelinesTable)
    .set({ files: updatedFiles, updatedAt: new Date() })
    .where(
      and(
        eq(brandGuidelinesTable.id, guidelineId),
        eq(brandGuidelinesTable.workspaceId, workspaceId)
      )
    );

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
  const errors: string[] = [];

  // Upload all files to storage in parallel
  const uploadResults = await Promise.all(
    files.map(async ({ fileName, fileBuffer, contentType, fileSize }) => {
      // Sanitize filename — same pattern as studio/asset uploads (H-27)
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      const storagePath = `${workspaceId}/guidelines/${guidelineId}/${Date.now()}-${safeFileName}`;

      let publicUrl: string;
      try {
        publicUrl = await uploadBrandAsset(storagePath, fileBuffer, contentType);
      } catch (err) {
        errors.push(`${fileName}: ${err instanceof Error ? err.message : "Upload failed"}`);
        return null;
      }

      return {
        name: safeFileName,
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
      await db
        .update(brandGuidelinesTable)
        .set({ files: updatedFiles, updatedAt: new Date() })
        .where(
          and(
            eq(brandGuidelinesTable.id, guidelineId),
            eq(brandGuidelinesTable.workspaceId, workspaceId)
          )
        );
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
  // Remove from storage
  await deleteBrandAsset(filePath).catch(() => {});

  // Remove from files array
  const guideline = await getBrandGuidelineById(workspaceId, guidelineId);
  if (!guideline) return { success: false, error: "Guideline not found" };

  const updatedFiles = guideline.files.filter((f) => f.path !== filePath);
  await db
    .update(brandGuidelinesTable)
    .set({ files: updatedFiles, updatedAt: new Date() })
    .where(
      and(
        eq(brandGuidelinesTable.id, guidelineId),
        eq(brandGuidelinesTable.workspaceId, workspaceId)
      )
    );

  return { success: true };
}
