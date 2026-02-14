"use client";

import { useState, useEffect } from "react";
import { AutomationFilters } from "./automation-filters";
import { AutomationCard } from "./automation-card";
import { CreateAutomationButton } from "./create-automation-button";
import { PerformanceWizard } from "./performance-wizard";
import { CompetitorWizard } from "./competitor-wizard";
import { CommentWizard } from "./comment-wizard";
import { track } from "@/lib/analytics/events";
import type { Automation, AutomationType } from "@/types/automation";

interface AutomationsListClientProps {
  automations: Automation[];
}

export function AutomationsListClient({
  automations,
}: AutomationsListClientProps) {
  const [filter, setFilter] = useState<"all" | AutomationType>("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<AutomationType>("performance");
  const [editAutomation, setEditAutomation] = useState<Automation | null>(null);

  useEffect(() => {
    track("automations_page_viewed", { count: automations.length });
  }, [automations.length]);

  const filtered =
    filter === "all"
      ? automations
      : automations.filter((a) => a.type === filter);

  function handleCreate(type: AutomationType) {
    setWizardType(type);
    setEditAutomation(null);
    setWizardOpen(true);
  }

  function handleEdit(automation: Automation) {
    setWizardType(automation.type);
    setEditAutomation(automation);
    setWizardOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <AutomationFilters
          automations={automations}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
        <CreateAutomationButton onSelect={handleCreate} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No automations yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first automation to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AutomationCard key={a.id} automation={a} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {wizardType === "performance" && (
        <PerformanceWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          editAutomation={editAutomation}
        />
      )}

      {wizardType === "competitor" && (
        <CompetitorWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          editAutomation={editAutomation}
        />
      )}

      {wizardType === "comments" && (
        <CommentWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          editAutomation={editAutomation}
        />
      )}
    </>
  );
}
