"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CreditBalance } from "@/components/shared/credit-balance";
import { track } from "@/lib/analytics/events";

interface TopBarProps {
  actions?: React.ReactNode;
}

export function TopBar({ actions }: TopBarProps) {
  function handleRefresh() {
    track("refresh_clicked");
    // TODO: Phase 4+ will implement actual Meta sync
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Meta sync status */}
      <div className="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-blue-600"
        >
          <path
            d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
            fill="currentColor"
          />
        </svg>
        <span className="text-sm text-muted-foreground">Meta connected</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        <CreditBalance />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="size-8"
        >
          <RefreshCw className="size-4" />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
    </header>
  );
}
