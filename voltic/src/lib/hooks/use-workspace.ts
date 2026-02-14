"use client";

import { createContext, useContext } from "react";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  credit_balance: number;
  settings: Record<string, unknown>;
  meta_connected: boolean;
}

interface WorkspaceContextValue {
  workspace: Workspace;
  workspaceId: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
