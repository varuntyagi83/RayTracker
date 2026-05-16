import { verifyToken } from "@clerk/backend";
import { createAdminClient } from "@/lib/supabase/admin";

interface ExtensionAuthResult {
  valid: boolean;
  userId?: string;
  workspaceId?: string;
  error?: string;
}

/**
 * Validates a Clerk session token from the Chrome extension.
 * Returns the user ID and their workspace ID if valid.
 */
export async function validateExtensionToken(
  token: string
): Promise<ExtensionAuthResult> {
  let userId: string;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    userId = payload.sub;
  } catch {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Look up workspace membership
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .single();

  if (!member) {
    return { valid: false, error: "User has no workspace" };
  }

  return {
    valid: true,
    userId,
    workspaceId: member.workspace_id,
  };
}
