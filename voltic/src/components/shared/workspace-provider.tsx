"use client";

import { WorkspaceContext, type Workspace } from "@/lib/hooks/use-workspace";

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaceId: workspace.id }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
