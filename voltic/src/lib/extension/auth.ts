import { verifyToken } from "@clerk/backend";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
export async function validateExtensionToken(token: string): Promise<ExtensionAuthResult> {
  let userId: string;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    userId = payload.sub;
  } catch {
    return { valid: false, error: "Invalid or expired token" };
  }

  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!member) {
    return { valid: false, error: "User has no workspace" };
  }

  return { valid: true, userId, workspaceId: member.workspaceId };
}
