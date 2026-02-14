"use server";

import { z } from "zod";
import { getWorkspace } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBrandGuidelines,
  updateBrandGuidelines,
  uploadBrandAsset,
  deleteBrandAsset,
} from "@/lib/data/brand-guidelines";
import type { BrandGuidelines, BrandGuidelineFile } from "@/types/variations";

// ─── Workspace Timezone ─────────────────────────────────────────────────────

export async function fetchWorkspaceTimezone(): Promise<{
  timezone?: string;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };
  return { timezone: workspace.timezone };
}

const updateTimezoneSchema = z.object({
  timezone: z.string().min(1),
});

export async function updateWorkspaceTimezoneAction(
  input: z.input<typeof updateTimezoneSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = updateTimezoneSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  // Validate against IANA timezones
  const validTimezones = Intl.supportedValuesOf("timeZone");
  if (!validTimezones.includes(parsed.data.timezone)) {
    return { success: false, error: "Invalid timezone" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ timezone: parsed.data.timezone })
    .eq("id", workspace.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Meta Disconnect ─────────────────────────────────────────────────────────

export async function disconnectMetaAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ meta_access_token: null })
    .eq("id", workspace.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Fetch Brand Guidelines ────────────────────────────────────────────────

export async function fetchBrandGuidelines(): Promise<{
  data?: BrandGuidelines;
  error?: string;
}> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "No workspace" };

  const guidelines = await getBrandGuidelines(workspace.id);
  return { data: guidelines };
}

// ─── Save Brand Guidelines (text fields) ────────────────────────────────────

const saveBrandGuidelinesSchema = z.object({
  brandName: z.string().max(100).optional(),
  brandVoice: z.string().max(1000).optional(),
  colorPalette: z.string().max(500).optional(),
  targetAudience: z.string().max(1000).optional(),
  dosAndDonts: z.string().max(2000).optional(),
});

export async function saveBrandGuidelinesAction(
  input: z.input<typeof saveBrandGuidelinesSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = saveBrandGuidelinesSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await updateBrandGuidelines(workspace.id, parsed.data);
}

// ─── Upload Brand File ──────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

export async function uploadBrandFileAction(
  formData: FormData
): Promise<{ success: boolean; file?: BrandGuidelineFile; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0)
    return { success: false, error: "No file provided" };
  if (file.size > MAX_FILE_SIZE)
    return { success: false, error: "File must be under 10MB" };
  if (!ALLOWED_TYPES.includes(file.type))
    return {
      success: false,
      error: "Only PDF, PNG, JPG, SVG, and WebP files are allowed",
    };

  // Check max 5 files
  const guidelines = await getBrandGuidelines(workspace.id);
  if ((guidelines.files?.length ?? 0) >= 5)
    return { success: false, error: "Maximum 5 brand files allowed" };

  const buffer = Buffer.from(await file.arrayBuffer());
  return await uploadBrandAsset(
    workspace.id,
    file.name,
    buffer,
    file.type,
    file.size
  );
}

// ─── Delete Brand File ──────────────────────────────────────────────────────

const deleteBrandFileSchema = z.object({
  filePath: z.string().min(1),
});

export async function deleteBrandFileAction(
  input: z.input<typeof deleteBrandFileSchema>
): Promise<{ success: boolean; error?: string }> {
  const workspace = await getWorkspace();
  if (!workspace) return { success: false, error: "No workspace" };

  const parsed = deleteBrandFileSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  return await deleteBrandAsset(workspace.id, parsed.data.filePath);
}
