import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Workspace } from "@/lib/hooks/use-workspace";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getWorkspace(): Promise<Workspace | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  // First-login migration: Clerk ID won't match old Supabase UUID.
  // Look up the user's email in Clerk, find the matching Supabase UUID,
  // and update workspace_members in place — transparent to the user.
  if (!member) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (email) {
      const supabase = createAdminClient();
      const { data: supabaseUser } = await supabase.auth.admin.getUserByEmail(email);
      if (supabaseUser?.user?.id) {
        const oldUuid = supabaseUser.user.id;
        const [legacyMember] = await db
          .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, oldUuid))
          .limit(1);
        if (legacyMember) {
          await db
            .update(workspaceMembers)
            .set({ userId })
            .where(eq(workspaceMembers.userId, oldUuid));
          member = { workspaceId: legacyMember.workspaceId };
        }
      }
    }
  }

  if (!member) return null;

  const [workspace] = await db
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
    .where(eq(workspaces.id, member.workspaceId))
    .limit(1);

  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    timezone: workspace.timezone,
    currency: workspace.currency,
    credit_balance: workspace.creditBalance,
    settings: workspace.settings as Record<string, unknown>,
    meta_connected: !!workspace.metaAccessToken,
    slack_connected: !!workspace.slackAccessToken,
    slack_team_name: workspace.slackTeamName ?? null,
  };
}

export async function getUser() {
  const { userId } = await auth();
  return userId ? { id: userId } : null;
}
