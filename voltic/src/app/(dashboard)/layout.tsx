import { redirect } from "next/navigation";
import { getWorkspaces, getWorkspace, getUser } from "@/lib/supabase/queries";
import { isSuperAdmin } from "@/lib/admin";
import { WorkspaceProvider } from "@/components/shared/workspace-provider";
import { PostHogIdentify } from "@/components/shared/posthog-identify";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  let workspace;
  let allWorkspaces;

  try {
    user = await getUser();
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  try {
    [workspace, allWorkspaces] = await Promise.all([
      getWorkspace(),
      getWorkspaces(),
    ]);
  } catch {
    redirect("/login");
  }
  if (!workspace) redirect("/onboarding");

  return (
    <WorkspaceProvider workspace={workspace} allWorkspaces={allWorkspaces ?? []}>
      <PostHogIdentify
        userId={user.id}
        email={user.email ?? ""}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
      <SidebarProvider>
        <AppSidebar userEmail={user.email ?? ""} isSuperAdmin={isSuperAdmin(user.id)} />
        <SidebarInset>
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
