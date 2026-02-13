"use client";

import { useEffect } from "react";
import { identifyUser, groupByWorkspace } from "@/lib/analytics/posthog-provider";

interface PostHogIdentifyProps {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
}

export function PostHogIdentify({
  userId,
  email,
  workspaceId,
  workspaceName,
}: PostHogIdentifyProps) {
  useEffect(() => {
    identifyUser(userId, { email });
    groupByWorkspace(workspaceId, { name: workspaceName });
  }, [userId, email, workspaceId, workspaceName]);

  return null;
}
