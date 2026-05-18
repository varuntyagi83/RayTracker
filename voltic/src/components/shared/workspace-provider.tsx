"use client";

import { WorkspaceContext, type Workspace } from "@/lib/hooks/use-workspace";

export function WorkspaceProvider({
  workspace,
  allWorkspaces,
  children,
}: {
  workspace: Workspace;
  allWorkspaces: Workspace[];
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaceId: workspace.id, allWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
