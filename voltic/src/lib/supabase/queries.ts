import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, inArray, ne, and } from "drizzle-orm";
import type { Workspace } from "@/lib/hooks/use-workspace";
import { isSuperAdmin, getSuperAdminUserId } from "@/lib/admin";

const WORKSPACE_COOKIE = "voltic-active-workspace";

function rowToWorkspace(row: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  creditBalance: number;
  settings: unknown;
  metaAccessToken: string | null;
  slackAccessToken: string | null;
  slackTeamName: string | null;
}): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    currency: row.currency,
    credit_balance: row.creditBalance,
    settings: row.settings as Record<string, unknown>,
    meta_connected: !!row.metaAccessToken,
    slack_connected: !!row.slackAccessToken,
    slack_team_name: row.slackTeamName ?? null,
  };
}

const WORKSPACE_COLUMNS = {
  id: workspaces.id,
  name: workspaces.name,
  slug: workspaces.slug,
  timezone: workspaces.timezone,
  currency: workspaces.currency,
  creditBalance: workspaces.creditBalance,
  settings: workspaces.settings,
  metaAccessToken: workspaces.metaAccessToken,
  slackAccessToken: workspaces.slackAccessToken,
  slackTeamName: workspaces.slackTeamName,
} as const;

export async function getWorkspaces(): Promise<Workspace[]> {
  const { userId } = await auth();
  if (!userId) return [];

  // Super-admin sees every workspace in the platform.
  if (isSuperAdmin(userId)) {
    const rows = await db.select(WORKSPACE_COLUMNS).from(workspaces);
    return rows.map(rowToWorkspace);
  }

  const members = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  if (members.length === 0) return [];

  const workspaceIds = members.map((m) => m.workspaceId);
  const rows = await db
    .select(WORKSPACE_COLUMNS)
    .from(workspaces)
    .where(inArray(workspaces.id, workspaceIds));

  return rows.map(rowToWorkspace);
}

export async function getWorkspace(): Promise<Workspace | null> {
  const all = await getWorkspaces();
  if (all.length === 0) return null;
  if (all.length === 1) return all[0];

  const cookieStore = await cookies();
  const activeId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (activeId) {
    const preferred = all.find((w) => w.id === activeId);
    if (preferred) return preferred;
  }

  return all[0];
}

export async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await clerkCurrentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  return { id: userId, email };
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
}

/**
 * Returns workspace members visible to regular users.
 * The super-admin is always filtered out so they remain invisible
 * to customers regardless of whether they hold a membership row.
 */
export async function getWorkspaceMembersForUser(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const adminId = getSuperAdminUserId();

  const query = db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .where(
      adminId
        ? and(
            eq(workspaceMembers.workspaceId, workspaceId),
            ne(workspaceMembers.userId, adminId)
          )
        : eq(workspaceMembers.workspaceId, workspaceId)
    )
    .orderBy(workspaceMembers.createdAt);

  return query;
}
