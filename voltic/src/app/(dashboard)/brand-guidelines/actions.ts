"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import {
  listBrandGuidelines,
  getBrandGuidelineById,
  createBrandGuideline,
  updateBrandGuideline,
  deleteBrandGuideline,
  setDefaultBrandGuideline,
  uploadBrandGuidelineLogo,
  uploadBrandGuidelineFile,
  uploadBrandGuidelineFiles,
  deleteBrandGuidelineFile,
} from "@/lib/data/brand-guidelines-entities";
import { generateBrandGuidelinesFromMedia } from "@/lib/ai/brand-guidelines-generator";
import type { BrandGuidelineEntity, BrandGuidelineInput, ColorSwatch, Typography } from "@/types/brand-guidelines";
import type { LLMProvider } from "@/types/creative-studio";
import { BRAND_GUIDELINES_AI_CREDIT_COST } from "@/types/brand-guidelines";

// ─── Fetch All ──────────────────────────────────────────────────────────────

export async function fetchBrandGuidelinesListAction(): Promise<{
  data?: BrandGuidelineEntity[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const data = await listBrandGuidelines(workspace.id);
  return { data };
}

// ─── Fetch Single ───────────────────────────────────────────────────────────

export async function fetchBrandGuidelineAction(input: {
  id: string;
}): Promise<{ data?: BrandGuidelineEntity; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const data = await getBrandGuidelineById(workspace.id, input.id);
  if (!data) return { error: "Not found" };
  return { data };
}

// ─── Create ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  brandName: z.string().optional(),
  brandVoice: z.string().optional(),
  colorPalette: z.array(z.object({ hex: z.string(), name: z.string() })).optional(),
  typography: z.object({
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
    sizes: z.record(z.string(), z.string()).optional(),
  }).optional(),
  targetAudience: z.string().optional(),
  dosAndDonts: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function createBrandGuidelineAction(
  input: z.input<typeof createSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  return await createBrandGuideline(workspace.id, parsed.data as BrandGuidelineInput);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateBrandGuidelineAction(input: {
  id: string;
  name?: string;
  brandName?: string;
  brandVoice?: string;
  colorPalette?: ColorSwatch[];
  typography?: Typography;
  targetAudience?: string;
  dosAndDonts?: string;
  isDefault?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const { id, ...updates } = input;
  return await updateBrandGuideline(workspace.id, id, updates);
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteBrandGuidelineAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await deleteBrandGuideline(workspace.id, input.id);
}

// ─── Set Default ────────────────────────────────────────────────────────────

export async function setDefaultBrandGuidelineAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await setDefaultBrandGuideline(workspace.id, input.id);
}

// ─── Upload Logo ────────────────────────────────────────────────────────────

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function uploadBrandGuidelineLogoAction(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelineId = formData.get("guidelineId") as string;
  const file = formData.get("file") as File | null;

  if (!guidelineId) return { error: "Guideline ID is required" };
  if (!file || file.size === 0) return { error: "File is required" };
  if (file.size > MAX_LOGO_SIZE) return { error: "Logo must be under 5MB" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Only JPG, PNG, WebP, and SVG images are allowed" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return await uploadBrandGuidelineLogo(workspace.id, guidelineId, file.name, buffer, file.type);
}

// ─── Upload File ────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadBrandGuidelineFileAction(
  formData: FormData
): Promise<{ file?: { name: string; url: string; path: string; size: number; type: string; uploadedAt: string }; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelineId = formData.get("guidelineId") as string;
  const file = formData.get("file") as File | null;

  if (!guidelineId) return { error: "Guideline ID is required" };
  if (!file || file.size === 0) return { error: "File is required" };
  if (file.size > MAX_FILE_SIZE) return { error: "File must be under 20MB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  return await uploadBrandGuidelineFile(
    workspace.id,
    guidelineId,
    file.name,
    buffer,
    file.type,
    file.size
  );
}

// ─── Upload Files (Batch) ────────────────────────────────────────────────────

export async function uploadBrandGuidelineFilesAction(
  formData: FormData
): Promise<{
  files?: Array<{ name: string; url: string; path: string; size: number; type: string; uploadedAt: string }>;
  errors?: string[];
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelineId = formData.get("guidelineId") as string;
  if (!guidelineId) return { error: "Guideline ID is required" };

  // Extract all files from FormData
  const rawFiles = formData.getAll("files") as File[];
  if (rawFiles.length === 0) return { error: "No files provided" };

  // Validate all files upfront
  for (const file of rawFiles) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: `${file.name} exceeds 20MB limit` };
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

  return { files: result.files, errors: result.errors.length > 0 ? result.errors : undefined };
}

// ─── Delete File ────────────────────────────────────────────────────────────

export async function deleteBrandGuidelineFileAction(input: {
  id: string;
  filePath: string;
}): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  return await deleteBrandGuidelineFile(workspace.id, input.id, input.filePath);
}

// ─── AI Generate Brand Guidelines ──────────────────────────────────────────

export async function generateBrandGuidelinesAIAction(input: {
  guidelineId: string;
  provider: LLMProvider;
  model: string;
  imageUrls: string[];
}): Promise<{
  success: boolean;
  data?: {
    brandName: string;
    brandVoice: string;
    colorPalette: ColorSwatch[];
    typography: Typography;
    targetAudience: string;
    dosAndDonts: string;
  };
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  if (input.imageUrls.length === 0) {
    return { success: false, error: "At least one image is required" };
  }

  try {
    const result = await generateBrandGuidelinesFromMedia({
      provider: input.provider,
      model: input.model,
      imageUrls: input.imageUrls,
    });

    // Update the guideline with AI results
    await updateBrandGuideline(workspace.id, input.guidelineId, {
      brandName: result.brandName,
      brandVoice: result.brandVoice,
      colorPalette: result.colorPalette,
      typography: result.typography,
      targetAudience: result.targetAudience,
      dosAndDonts: result.dosAndDonts,
    });

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return { success: false, error: message };
  }
}

// ─── Import Legacy Brand Guidelines ─────────────────────────────────────────

export async function importLegacyBrandGuidelinesAction(): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  // Check if there are already entities — skip if so
  const existing = await listBrandGuidelines(workspace.id);
  if (existing.length > 0) {
    return { success: false, error: "Brand guidelines already exist. Import skipped." };
  }

  // Fetch legacy from workspace settings
  const { getBrandGuidelines } = await import("@/lib/data/brand-guidelines");
  const legacy = await getBrandGuidelines(workspace.id);

  if (!legacy.brandName && !legacy.brandVoice && !legacy.colorPalette) {
    return { success: false, error: "No legacy brand guidelines found to import" };
  }

  // Parse color palette string to ColorSwatch[]
  let colorPalette: ColorSwatch[] = [];
  if (legacy.colorPalette) {
    const hexMatches = legacy.colorPalette.match(/#[0-9a-fA-F]{3,8}/g);
    if (hexMatches) {
      colorPalette = hexMatches.map((hex, i) => ({
        hex,
        name: `Color ${i + 1}`,
      }));
    }
  }

  const result = await createBrandGuideline(workspace.id, {
    name: legacy.brandName ?? "My Brand",
    brandName: legacy.brandName,
    brandVoice: legacy.brandVoice,
    colorPalette,
    targetAudience: legacy.targetAudience,
    dosAndDonts: legacy.dosAndDonts,
    isDefault: true,
  });

  return result;
}
