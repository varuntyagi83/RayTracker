import { verifyToken } from "@clerk/backend";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const WORKSPACE_COOKIE = "voltic-active-workspace";

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

  const memberRows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaceMembers.createdAt));

  if (memberRows.length === 0) {
    return { valid: false, error: "User has no workspace" };
  }

  // Respect the active-workspace cookie so the extension operates on the
  // same workspace the user has selected in the web app.
  let workspaceId = memberRows[0].workspaceId;
  try {
    const cookieStore = await cookies();
    const preferred = cookieStore.get(WORKSPACE_COOKIE)?.value;
    if (preferred && memberRows.some((m) => m.workspaceId === preferred)) {
      workspaceId = preferred;
    }
  } catch {
    // cookies() unavailable outside a request context — use first row
  }

  return { valid: true, userId, workspaceId };
}
