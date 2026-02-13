"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, BarChart3, Search, MessageSquare } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog-provider";
import type { AutomationType } from "@/types/automation";

interface CreateAutomationButtonProps {
  onSelect: (type: AutomationType) => void;
}

export function CreateAutomationButton({
  onSelect,
}: CreateAutomationButtonProps) {
  function handleSelect(type: AutomationType) {
    trackEvent("create_automation_clicked", { type });
    onSelect(type);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Create automation
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSelect("performance")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Performance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("competitor")}>
          <Search className="mr-2 h-4 w-4" />
          Competitor
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("comments")}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Comments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
