import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      creditBalance: workspaces.creditBalance,
      metaConnected: sql<boolean>`(${workspaces.metaAccessToken} is not null)`,
      slackConnected: sql<boolean>`(${workspaces.slackAccessToken} is not null)`,
      slackTeamName: workspaces.slackTeamName,
      createdAt: workspaces.createdAt,
      memberCount: sql<number>`(
        select count(*) from workspace_members wm
        where wm.workspace_id = ${workspaces.id}
      )`,
    })
    .from(workspaces)
    .orderBy(workspaces.createdAt);

  return NextResponse.json({ workspaces: rows });
}
