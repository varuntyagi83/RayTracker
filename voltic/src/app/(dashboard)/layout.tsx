import { redirect } from "next/navigation";
import { getWorkspace, getUser } from "@/lib/supabase/queries";
import { WorkspaceProvider } from "@/components/shared/workspace-provider";
import { PostHogIdentify } from "@/components/shared/posthog-identify";

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
      <main className="min-h-screen">{children}</main>
    </WorkspaceProvider>
  );
}
