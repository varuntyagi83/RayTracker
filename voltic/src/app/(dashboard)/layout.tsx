import { redirect } from "next/navigation";
import { getWorkspace, getUser } from "@/lib/supabase/queries";
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
  const user = await getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace();
  if (!workspace) redirect("/signup");

  return (
    <WorkspaceProvider workspace={workspace}>
      <PostHogIdentify
        userId={user.id}
        email={user.email ?? ""}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
      <SidebarProvider>
        <AppSidebar userEmail={user.email ?? ""} />
        <SidebarInset>
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
