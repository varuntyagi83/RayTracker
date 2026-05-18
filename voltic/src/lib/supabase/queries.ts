import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { Workspace } from "@/lib/hooks/use-workspace";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function getWorkspaces(): Promise<Workspace[]> {
  const { userId } = await auth();
  if (!userId) return [];

  let members = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  // First-login migration: Clerk ID won't match old Supabase UUID.
  // Look up by email in Supabase, migrate all rows for that user in one pass.
  if (members.length === 0) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (email) {
      const supabase = createAdminClient();
      const { data: supabaseUser } = await supabase.auth.admin.getUserByEmail(email);
      if (supabaseUser?.user?.id) {
        const oldUuid = supabaseUser.user.id;
        const legacyMembers = await db
          .select({ workspaceId: workspaceMembers.workspaceId })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, oldUuid));
        if (legacyMembers.length > 0) {
          await db
            .update(workspaceMembers)
            .set({ userId })
            .where(eq(workspaceMembers.userId, oldUuid));
          members = legacyMembers;
        }
      }
    }
  }

  if (members.length === 0) return [];

  const workspaceIds = members.map((m) => m.workspaceId);
  const rows = await db
    .select({
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
    })
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
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  return { id: userId, email };
}
