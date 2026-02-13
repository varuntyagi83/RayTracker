"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AutomationType, Automation } from "@/types/automation";

interface AutomationFiltersProps {
  automations: Automation[];
  activeFilter: "all" | AutomationType;
  onFilterChange: (filter: "all" | AutomationType) => void;
}

export function AutomationFilters({
  automations,
  activeFilter,
  onFilterChange,
}: AutomationFiltersProps) {
  const counts = {
    all: automations.length,
    performance: automations.filter((a) => a.type === "performance").length,
    competitor: automations.filter((a) => a.type === "competitor").length,
    comments: automations.filter((a) => a.type === "comments").length,
  };

  return (
    <Tabs
      value={activeFilter}
      onValueChange={(v) => onFilterChange(v as "all" | AutomationType)}
    >
      <TabsList>
        <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        <TabsTrigger value="performance">
          Performance ({counts.performance})
        </TabsTrigger>
        <TabsTrigger value="competitor">
          Competitor ({counts.competitor})
        </TabsTrigger>
        <TabsTrigger value="comments">
          Comments ({counts.comments})
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
