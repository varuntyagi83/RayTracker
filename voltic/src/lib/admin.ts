/**
 * Super-admin utilities.
 *
 * The super-admin is identified by SUPER_ADMIN_USER_ID in env. This is a
 * single Clerk user ID that grants platform-wide access: all workspaces,
 * all members, all management operations.
 *
 * VISIBILITY RULE: the super-admin is a ghost to regular workspace users.
 * Any user-facing member query must call isSuperAdminUserId() and exclude
 * that ID. Use getWorkspaceMembersForUser() in lib/supabase/queries.ts for
 * any feature that shows members to non-admin users.
 */

export function isSuperAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminId = process.env.SUPER_ADMIN_USER_ID;
  if (!adminId) return false;
  return userId === adminId;
}

/** Returns the super-admin Clerk user ID, or null if not configured. */
export function getSuperAdminUserId(): string | null {
  return process.env.SUPER_ADMIN_USER_ID ?? null;
}
