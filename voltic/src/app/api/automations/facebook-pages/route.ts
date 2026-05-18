import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { facebookPages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getWorkspace } from "@/lib/supabase/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const pages = await db
    .select({
      id: facebookPages.id,
      pageId: facebookPages.pageId,
      pageName: facebookPages.pageName,
      hasInstagram: facebookPages.hasInstagram,
      instagramHandle: facebookPages.instagramHandle,
    })
    .from(facebookPages)
    .where(eq(facebookPages.workspaceId, workspace.id))
    .orderBy(asc(facebookPages.pageName));

  return NextResponse.json({ pages });
}
