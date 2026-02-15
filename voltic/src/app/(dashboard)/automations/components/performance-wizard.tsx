"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Plus, Trash2, Slack, MessageCircle } from "lucide-react";
import { WizardPreview } from "./wizard-preview";
import { createAutomation, updateAutomation } from "../actions";
import { track } from "@/lib/analytics/events";
import {
  type PerformanceWizardState,
  type MetricKey,
  type TimePeriod,
  type AggregationLevel,
  type SortDirection,
  type Frequency,
  type DayOfWeek,
  type EntityFilter,
  type MetricFilter,
  type Automation,
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_SCHEDULE,
  DEFAULT_DELIVERY,
  METRIC_LABELS,
  AGGREGATION_LABELS,
  PERIOD_LABELS,
  PERIOD_COLORS,
} from "@/types/automation";

const STEPS = ["Basics", "Groups", "Notify", "Schedule"] as const;
const ALL_METRICS: MetricKey[] = [
  "spend",
  "roas",
  "revenue",
  "purchases",
  "lp_views",
  "impressions",
  "ctr",
];
const ALL_PERIODS: TimePeriod[] = ["yesterday", "today", "last_7d"];
const ALL_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface PerformanceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAutomation?: Automation | null;
}

function initState(edit?: Automation | null): PerformanceWizardState {
  if (edit) {
    const config = edit.config as PerformanceWizardState["config"];
    return {
      name: edit.name,
      description: edit.description ?? "",
      config: { ...DEFAULT_PERFORMANCE_CONFIG, ...config },
      delivery: { ...DEFAULT_DELIVERY, ...(edit.delivery as PerformanceWizardState["delivery"]) },
      schedule: { ...DEFAULT_SCHEDULE, ...(edit.schedule as PerformanceWizardState["schedule"]) },
    };
  }
  return {
    name: "",
    description: "",
    config: { ...DEFAULT_PERFORMANCE_CONFIG },
    delivery: { ...DEFAULT_DELIVERY },
    schedule: { ...DEFAULT_SCHEDULE },
  };
}

export function PerformanceWizard({
  open,
  onOpenChange,
  editAutomation,
}: PerformanceWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<PerformanceWizardState>(() =>
    initState(editAutomation)
  );
  const [saving, setSaving] = useState(false);

  // Re-initialize state when switching between create/edit mode
  useEffect(() => {
    setState(initState(editAutomation));
    setStep(0);
  }, [editAutomation?.id]);

  function update(partial: Partial<PerformanceWizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function updateConfig(
    partial: Partial<PerformanceWizardState["config"]>
  ) {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
    }));
  }

  function updateSchedule(
    partial: Partial<PerformanceWizardState["schedule"]>
  ) {
    setState((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, ...partial },
    }));
  }

  function nextStep() {
    track("automation_wizard_step_completed", {
      step: STEPS[step],
      step_number: step + 1,
    });
    setStep((s) => Math.min(s + 1, 3));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleClose() {
    track("automation_wizard_abandoned", { step: STEPS[step] });
    onOpenChange(false);
  }

  async function handleSave(status: "draft" | "active") {
    setSaving(true);

    const payload = {
      name: state.name,
      description: state.description,
      type: "performance" as const,
      status,
      config: state.config as unknown as Record<string, unknown>,
      schedule: state.schedule as unknown as Record<string, unknown>,
      delivery: state.delivery as unknown as Record<string, unknown>,
      classification: state.config.classification.enabled
        ? (state.config.classification as unknown as Record<string, unknown>)
        : null,
    };

    const result = editAutomation
      ? await updateAutomation(editAutomation.id, payload)
      : await createAutomation(payload);

    if (!result.error) {
      track("automation_created", {
        type: "performance",
        status,
        metrics_count: state.config.metrics.length,
      });
      router.refresh();
      onOpenChange(false);
    }
    setSaving(false);
  }

  // ── Toggle helpers ──
  function toggleMetric(m: MetricKey) {
    const current = state.config.metrics;
    const next = current.includes(m)
      ? current.filter((x) => x !== m)
      : [...current, m];
    if (next.length > 0) {
      const updates: Partial<typeof state.config> = { metrics: next };
      // Keep sortBy.metric in sync: if current sort metric is removed, default to first
      if (!next.includes(state.config.sortBy.metric)) {
        updates.sortBy = { ...state.config.sortBy, metric: next[0] };
      }
      updateConfig(updates);
    }
  }

  function togglePeriod(p: TimePeriod) {
    const current = state.config.timePeriods;
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    if (next.length > 0) updateConfig({ timePeriods: next });
  }

  function toggleDay(d: DayOfWeek) {
    const current = state.schedule.days;
    const next = current.includes(d)
      ? current.filter((x) => x !== d)
      : [...current, d];
    updateSchedule({ days: next });
  }

  // ── Entity filter helpers ──
  function addEntityFilter() {
    const f: EntityFilter = {
      id: crypto.randomUUID(),
      field: "name",
      operator: "contains",
      value: "",
    };
    updateConfig({
      filters: {
        ...state.config.filters,
        entity: [...state.config.filters.entity, f],
      },
    });
  }

  function removeEntityFilter(id: string) {
    updateConfig({
      filters: {
        ...state.config.filters,
        entity: state.config.filters.entity.filter((f) => f.id !== id),
      },
    });
  }

  function updateEntityFilter(id: string, partial: Partial<EntityFilter>) {
    updateConfig({
      filters: {
        ...state.config.filters,
        entity: state.config.filters.entity.map((f) =>
          f.id === id ? { ...f, ...partial } : f
        ),
      },
    });
  }

  // ── Metric filter helpers ──
  function addMetricFilter() {
    const f: MetricFilter = {
      id: crypto.randomUUID(),
      metric: "spend",
      operator: "gt",
      value: 0,
      period: "yesterday",
    };
    updateConfig({
      filters: {
        ...state.config.filters,
        metric: [...state.config.filters.metric, f],
      },
    });
  }

  function removeMetricFilter(id: string) {
    updateConfig({
      filters: {
        ...state.config.filters,
        metric: state.config.filters.metric.filter((f) => f.id !== id),
      },
    });
  }

  function updateMetricFilter(id: string, partial: Partial<MetricFilter>) {
    updateConfig({
      filters: {
        ...state.config.filters,
        metric: state.config.filters.metric.map((f) =>
          f.id === id ? { ...f, ...partial } : f
        ),
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {editAutomation ? "Edit" : "Create"} Performance Automation
          </DialogTitle>
          <div className="mt-3 space-y-2">
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(i)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    i === step
                      ? "bg-emerald-600 text-white"
                      : i < step
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Progress value={((step + 1) / 4) * 100} className="h-1" />
          </div>
        </DialogHeader>

        {/* Body: form + preview side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-6 py-4">
          <div className="space-y-5">
            {step === 0 && (
              <StepBasics
                state={state}
                onUpdate={update}
                onUpdateConfig={updateConfig}
                onToggleMetric={toggleMetric}
                onTogglePeriod={togglePeriod}
              />
            )}
            {step === 1 && (
              <StepGroups
                state={state}
                onAddEntityFilter={addEntityFilter}
                onRemoveEntityFilter={removeEntityFilter}
                onUpdateEntityFilter={updateEntityFilter}
                onAddMetricFilter={addMetricFilter}
                onRemoveMetricFilter={removeMetricFilter}
                onUpdateMetricFilter={updateMetricFilter}
              />
            )}
            {step === 2 && <StepNotify state={state} onUpdate={update} />}
            {step === 3 && (
              <StepSchedule
                state={state}
                onUpdateSchedule={updateSchedule}
                onToggleDay={toggleDay}
              />
            )}
          </div>

          <div className="hidden lg:block">
            <WizardPreview state={state} />
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 0}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                onClick={nextStep}
                disabled={step === 0 && !state.name.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave("active")}
                  disabled={saving || !state.name.trim()}
                >
                  {saving ? "Saving..." : "Save & Test Run"}
                </Button>
                <Button
                  onClick={() => handleSave("draft")}
                  disabled={saving || !state.name.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? "Saving..." : "Save Automation"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Basics ─────────────────────────────────────────────────────────

function StepBasics({
  state,
  onUpdate,
  onUpdateConfig,
  onToggleMetric,
  onTogglePeriod,
}: {
  state: PerformanceWizardState;
  onUpdate: (p: Partial<PerformanceWizardState>) => void;
  onUpdateConfig: (p: Partial<PerformanceWizardState["config"]>) => void;
  onToggleMetric: (m: MetricKey) => void;
  onTogglePeriod: (p: TimePeriod) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Daily Performance Summary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          value={state.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Optional description..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Aggregation Level</Label>
        <Select
          value={state.config.aggregation}
          onValueChange={(v) =>
            onUpdateConfig({ aggregation: v as AggregationLevel })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(AGGREGATION_LABELS) as AggregationLevel[]).map(
              (k) => (
                <SelectItem key={k} value={k}>
                  {AGGREGATION_LABELS[k]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Metrics</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_METRICS.map((m) => (
            <Toggle
              key={m}
              size="sm"
              pressed={state.config.metrics.includes(m)}
              onPressedChange={() => onToggleMetric(m)}
              className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
            >
              {METRIC_LABELS[m]}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Time Periods</Label>
        <div className="flex gap-2">
          {ALL_PERIODS.map((p) => (
            <Toggle
              key={p}
              size="sm"
              pressed={state.config.timePeriods.includes(p)}
              onPressedChange={() => onTogglePeriod(p)}
              className={`data-[state=on]:${PERIOD_COLORS[p]}`}
            >
              {PERIOD_LABELS[p]}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Sort by</Label>
          <Select
            value={state.config.sortBy.metric}
            onValueChange={(v) =>
              onUpdateConfig({
                sortBy: { ...state.config.sortBy, metric: v as MetricKey },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.config.metrics.map((m) => (
                <SelectItem key={m} value={m}>
                  {METRIC_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select
            value={state.config.sortBy.direction}
            onValueChange={(v) =>
              onUpdateConfig({
                sortBy: {
                  ...state.config.sortBy,
                  direction: v as SortDirection,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Highest first</SelectItem>
              <SelectItem value="asc">Lowest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Period</Label>
          <Select
            value={state.config.sortBy.period}
            onValueChange={(v) =>
              onUpdateConfig({
                sortBy: {
                  ...state.config.sortBy,
                  period: v as TimePeriod,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.config.timePeriods.map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Campaign Classification</Label>
          <p className="text-xs text-muted-foreground">
            Group by Critical (≤{" "}
            {state.config.classification.criticalThreshold}) and Top (≥{" "}
            {state.config.classification.topThreshold}) ROAS
          </p>
        </div>
        <Switch
          checked={state.config.classification.enabled}
          onCheckedChange={(checked) =>
            onUpdateConfig({
              classification: {
                ...state.config.classification,
                enabled: checked,
              },
            })
          }
        />
      </div>
    </div>
  );
}

// ─── Step 2: Groups & Filters ───────────────────────────────────────────────

function StepGroups({
  state,
  onAddEntityFilter,
  onRemoveEntityFilter,
  onUpdateEntityFilter,
  onAddMetricFilter,
  onRemoveMetricFilter,
  onUpdateMetricFilter,
}: {
  state: PerformanceWizardState;
  onAddEntityFilter: () => void;
  onRemoveEntityFilter: (id: string) => void;
  onUpdateEntityFilter: (id: string, p: Partial<EntityFilter>) => void;
  onAddMetricFilter: () => void;
  onRemoveMetricFilter: (id: string) => void;
  onUpdateMetricFilter: (id: string, p: Partial<MetricFilter>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Entity filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Entity Filters</Label>
          <Button variant="outline" size="sm" onClick={onAddEntityFilter}>
            <Plus className="mr-1 h-3 w-3" /> Add filter
          </Button>
        </div>
        {state.config.filters.entity.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No entity filters. All {AGGREGATION_LABELS[state.config.aggregation].toLowerCase()} will be included.
          </p>
        )}
        {state.config.filters.entity.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <Select
              value={f.field}
              onValueChange={(v) => onUpdateEntityFilter(f.id, { field: v })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={f.operator}
              onValueChange={(v) =>
                onUpdateEntityFilter(f.id, {
                  operator: v as EntityFilter["operator"],
                })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="starts_with">starts with</SelectItem>
                <SelectItem value="not_contains">not contains</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={f.value}
              onChange={(e) =>
                onUpdateEntityFilter(f.id, { value: e.target.value })
              }
              placeholder="Value..."
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveEntityFilter(f.id)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      {/* Metric filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Metric Filters</Label>
          <Button variant="outline" size="sm" onClick={onAddMetricFilter}>
            <Plus className="mr-1 h-3 w-3" /> Add filter
          </Button>
        </div>
        {state.config.filters.metric.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No metric filters. No thresholds applied.
          </p>
        )}
        {state.config.filters.metric.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <Select
              value={f.metric}
              onValueChange={(v) =>
                onUpdateMetricFilter(f.id, { metric: v as MetricKey })
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={f.operator}
              onValueChange={(v) =>
                onUpdateMetricFilter(f.id, {
                  operator: v as MetricFilter["operator"],
                })
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gt">&gt;</SelectItem>
                <SelectItem value="gte">≥</SelectItem>
                <SelectItem value="lt">&lt;</SelectItem>
                <SelectItem value="lte">≤</SelectItem>
                <SelectItem value="eq">=</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={f.value}
              onChange={(e) =>
                onUpdateMetricFilter(f.id, {
                  value: Number(e.target.value),
                })
              }
              className="w-24"
            />
            <Select
              value={f.period}
              onValueChange={(v) =>
                onUpdateMetricFilter(f.id, { period: v as TimePeriod })
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveMetricFilter(f.id)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Notifications ──────────────────────────────────────────────────

function StepNotify({
  state,
  onUpdate,
}: {
  state: PerformanceWizardState;
  onUpdate: (p: Partial<PerformanceWizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <Label>Delivery Platform</Label>
      <div className="grid grid-cols-2 gap-4">
        <button
          className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
            state.delivery.platform === "slack"
              ? "border-emerald-600 bg-emerald-50"
              : "border-muted"
          }`}
          onClick={() =>
            onUpdate({ delivery: { ...state.delivery, platform: "slack" } })
          }
        >
          <Slack className="h-6 w-6 text-[#4A154B]" />
          <div className="text-left">
            <div className="font-medium text-sm">Slack</div>
            <div className="text-xs text-muted-foreground">
              Send to a channel
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3 rounded-lg border-2 border-muted p-4 opacity-50 cursor-not-allowed">
          <MessageCircle className="h-6 w-6 text-green-600" />
          <div className="text-left">
            <div className="font-medium text-sm">WhatsApp</div>
            <div className="text-xs text-muted-foreground">Coming Soon</div>
          </div>
        </div>
      </div>

      {state.delivery.platform === "slack" && (
        <div className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label htmlFor="slack-channel">Slack Channel</Label>
            <Input
              id="slack-channel"
              value={state.delivery.slackChannelName ?? ""}
              onChange={(e) =>
                onUpdate({
                  delivery: {
                    ...state.delivery,
                    slackChannelName: e.target.value,
                  },
                })
              }
              placeholder="#general"
            />
            <p className="text-xs text-muted-foreground">
              Enter the channel name. Slack integration will be connected in a
              later phase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Schedule ───────────────────────────────────────────────────────

function StepSchedule({
  state,
  onUpdateSchedule,
  onToggleDay,
}: {
  state: PerformanceWizardState;
  onUpdateSchedule: (p: Partial<PerformanceWizardState["schedule"]>) => void;
  onToggleDay: (d: DayOfWeek) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Frequency</Label>
        <div className="flex gap-2">
          {(["daily", "weekly"] as Frequency[]).map((f) => (
            <Toggle
              key={f}
              size="sm"
              pressed={state.schedule.frequency === f}
              onPressedChange={() => onUpdateSchedule({ frequency: f })}
              className="capitalize data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
            >
              {f}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          value={state.schedule.time}
          onChange={(e) => onUpdateSchedule({ time: e.target.value })}
          className="w-40"
        />
        <p className="text-xs text-muted-foreground">
          All times in {state.schedule.timezone}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Days</Label>
        <div className="flex gap-1.5">
          {ALL_DAYS.map((d) => (
            <button
              key={d}
              onClick={() => onToggleDay(d)}
              disabled={state.schedule.frequency === "daily"}
              className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                state.schedule.frequency === "daily"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : state.schedule.days.includes(d)
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d.slice(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
        {state.schedule.frequency === "daily" && (
          <p className="text-xs text-muted-foreground">
            Runs every day when frequency is set to Daily.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <span className="font-medium">Summary: </span>
        This automation will run{" "}
        <span className="font-medium capitalize">
          {state.schedule.frequency}
        </span>{" "}
        at <span className="font-medium">{state.schedule.time}</span>{" "}
        {state.schedule.timezone}
        {state.schedule.frequency === "weekly" &&
          state.schedule.days.length > 0 && (
            <>
              {" "}
              on{" "}
              <span className="font-medium">
                {state.schedule.days
                  .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                  .join(", ")}
              </span>
            </>
          )}
        .
      </div>
    </div>
  );
}
