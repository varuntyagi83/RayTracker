import { createAdminClient } from "@/lib/supabase/admin";

interface ExtensionAuthResult {
  valid: boolean;
  userId?: string;
  workspaceId?: string;
  error?: string;
}

/**
 * Validates a Supabase access token from the Chrome extension.
 * Returns the user ID and their workspace ID if valid.
 */
export async function validateExtensionToken(
  token: string
): Promise<ExtensionAuthResult> {
  const supabase = createAdminClient();

  // Validate the JWT via Supabase Auth
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Look up workspace membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { valid: false, error: "User has no workspace" };
  }

  return {
    valid: true,
    userId: user.id,
    workspaceId: member.workspace_id,
  };
}
