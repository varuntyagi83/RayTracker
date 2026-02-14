"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pause, Play, Pencil, Zap } from "lucide-react";
import { toast } from "sonner";
import { toggleAutomationStatus } from "../actions";
import { track } from "@/lib/analytics/events";
import type { Automation, PerformanceConfig, ScheduleConfig } from "@/types/automation";

interface AutomationCardProps {
  automation: Automation;
  onEdit: (automation: Automation) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-700",
};

const TYPE_STYLES: Record<string, string> = {
  performance: "bg-blue-100 text-blue-700",
  competitor: "bg-purple-100 text-purple-700",
  comments: "bg-orange-100 text-orange-700",
};

export function AutomationCard({ automation, onEdit }: AutomationCardProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  const config = automation.config as PerformanceConfig;
  const schedule = automation.schedule as ScheduleConfig;

  const metricTags =
    automation.type === "performance" && config.metrics
      ? config.metrics
      : [];

  async function handleToggle() {
    setToggling(true);
    const result = await toggleAutomationStatus(automation.id);
    if (!result.error) {
      track(
        result.status === "active"
          ? "automation_activated"
          : "automation_paused",
        { automation_id: automation.id }
      );
      toast.success(`Automation ${result.status === "active" ? "enabled" : "paused"}`);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update automation");
    }
    setToggling(false);
  }

  const updatedAt = new Date(automation.updated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className={STATUS_STYLES[automation.status] ?? ""}
              >
                {automation.status}
              </Badge>
              <Badge
                variant="secondary"
                className={TYPE_STYLES[automation.type] ?? ""}
              >
                {automation.type}
              </Badge>
            </div>
            <h3 className="text-base font-semibold truncate">
              {automation.name}
            </h3>
            {automation.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {automation.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(automation)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggle} disabled={toggling}>
                {automation.status === "active" ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggle} disabled={toggling}>
                <Zap className="mr-2 h-4 w-4" />
                Test Run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          <div>
            <span className="text-muted-foreground block">Schedule</span>
            <span className="font-medium capitalize">
              {schedule?.frequency ?? "—"}{" "}
              {schedule?.time ? `at ${schedule.time}` : ""}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Platform</span>
            <span className="font-medium capitalize">
              {automation.delivery &&
              typeof automation.delivery === "object" &&
              "platform" in automation.delivery
                ? String(automation.delivery.platform)
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Classification</span>
            <span className="font-medium">
              {automation.classification &&
              typeof automation.classification === "object" &&
              "enabled" in automation.classification &&
              automation.classification.enabled
                ? "Enabled"
                : "Off"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Last Updated</span>
            <span className="font-medium">{updatedAt}</span>
          </div>
        </div>

        {metricTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {metricTags.map((m) => (
              <Badge key={m} variant="outline" className="text-xs font-normal">
                {m.toUpperCase()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
