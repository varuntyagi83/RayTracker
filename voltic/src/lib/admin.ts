/**
 * Super-admin utilities.
 *
 * The super-admin is identified by SUPER_ADMIN_USER_ID in env. This is a
 * single Clerk user ID that grants platform-wide access: all workspaces,
 * all members, all management operations.
 */

export function isSuperAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminId = process.env.SUPER_ADMIN_USER_ID;
  if (!adminId) return false;
  return userId === adminId;
}
