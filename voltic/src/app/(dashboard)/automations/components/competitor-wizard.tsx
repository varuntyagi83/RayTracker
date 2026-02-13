"use client";

import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Slack, MessageCircle, HelpCircle } from "lucide-react";
import { CompetitorPreview } from "./competitor-preview";
import { createAutomation, updateAutomation } from "../actions";
import { trackEvent } from "@/lib/analytics/posthog-provider";
import {
  type CompetitorWizardState,
  type CompetitorConfig,
  type Frequency,
  type DayOfWeek,
  type ImpressionPeriod,
  type StartedWithin,
  type Automation,
  DEFAULT_COMPETITOR_CONFIG,
  DEFAULT_SCHEDULE,
  DEFAULT_DELIVERY,
  IMPRESSION_PERIOD_LABELS,
  STARTED_WITHIN_LABELS,
} from "@/types/automation";

const STEPS = ["Basics", "Notify", "Schedule"] as const;
const ALL_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface CompetitorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAutomation?: Automation | null;
}

function initState(edit?: Automation | null): CompetitorWizardState {
  if (edit) {
    const config = edit.config as CompetitorConfig;
    return {
      name: edit.name,
      description: edit.description ?? "",
      config: { ...DEFAULT_COMPETITOR_CONFIG, ...config },
      delivery: {
        ...DEFAULT_DELIVERY,
        ...(edit.delivery as CompetitorWizardState["delivery"]),
      },
      schedule: {
        ...DEFAULT_SCHEDULE,
        ...(edit.schedule as CompetitorWizardState["schedule"]),
      },
    };
  }
  return {
    name: "",
    description: "",
    config: { ...DEFAULT_COMPETITOR_CONFIG },
    delivery: { ...DEFAULT_DELIVERY },
    schedule: { ...DEFAULT_SCHEDULE },
  };
}

export function CompetitorWizard({
  open,
  onOpenChange,
  editAutomation,
}: CompetitorWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<CompetitorWizardState>(() =>
    initState(editAutomation)
  );
  const [saving, setSaving] = useState(false);

  function update(partial: Partial<CompetitorWizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function updateConfig(partial: Partial<CompetitorConfig>) {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
    }));
  }

  function updateScrapeSettings(
    partial: Partial<CompetitorConfig["scrapeSettings"]>
  ) {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        scrapeSettings: { ...prev.config.scrapeSettings, ...partial },
      },
    }));
  }

  function updateSchedule(
    partial: Partial<CompetitorWizardState["schedule"]>
  ) {
    setState((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, ...partial },
    }));
  }

  function nextStep() {
    trackEvent("automation_wizard_step_completed", {
      step: STEPS[step],
      step_number: step + 1,
      wizard_type: "competitor",
    });
    setStep((s) => Math.min(s + 1, 2));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleClose() {
    trackEvent("automation_wizard_abandoned", {
      step: STEPS[step],
      wizard_type: "competitor",
    });
    onOpenChange(false);
  }

  function toggleDay(d: DayOfWeek) {
    const current = state.schedule.days;
    const next = current.includes(d)
      ? current.filter((x) => x !== d)
      : [...current, d];
    updateSchedule({ days: next });
  }

  async function handleSave(status: "draft" | "active") {
    setSaving(true);

    const payload = {
      name: state.name,
      description: state.description,
      type: "competitor" as const,
      status,
      config: state.config as unknown as Record<string, unknown>,
      schedule: state.schedule as unknown as Record<string, unknown>,
      delivery: state.delivery as unknown as Record<string, unknown>,
      classification: null,
    };

    const result = editAutomation
      ? await updateAutomation(editAutomation.id, payload)
      : await createAutomation(payload);

    if (!result.error) {
      trackEvent("competitor_automation_created", {
        status,
        brand_name: state.config.brandName,
        top_n: state.config.scrapeSettings.topN,
      });
      router.refresh();
      onOpenChange(false);
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {editAutomation ? "Edit" : "Create"} Competitor Monitor
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
            <Progress value={((step + 1) / 3) * 100} className="h-1" />
          </div>
        </DialogHeader>

        {/* Body: form + preview side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-6 py-4">
          <div className="space-y-5">
            {step === 0 && (
              <StepCompetitorBasics
                state={state}
                onUpdate={update}
                onUpdateConfig={updateConfig}
                onUpdateScrapeSettings={updateScrapeSettings}
              />
            )}
            {step === 1 && <StepNotify state={state} onUpdate={update} />}
            {step === 2 && (
              <StepSchedule
                state={state}
                onUpdateSchedule={updateSchedule}
                onToggleDay={toggleDay}
              />
            )}
          </div>

          <div className="hidden lg:block">
            <CompetitorPreview state={state} />
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
            {step < 2 ? (
              <Button
                onClick={nextStep}
                disabled={
                  step === 0 &&
                  (!state.name.trim() || !state.config.brandName.trim())
                }
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave("active")}
                  disabled={
                    saving ||
                    !state.name.trim() ||
                    !state.config.brandName.trim()
                  }
                >
                  {saving ? "Saving..." : "Save & Test Run"}
                </Button>
                <Button
                  onClick={() => handleSave("draft")}
                  disabled={
                    saving ||
                    !state.name.trim() ||
                    !state.config.brandName.trim()
                  }
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

// ─── Step 1: Competitor Basics ───────────────────────────────────────────────

function StepCompetitorBasics({
  state,
  onUpdate,
  onUpdateConfig,
  onUpdateScrapeSettings,
}: {
  state: CompetitorWizardState;
  onUpdate: (p: Partial<CompetitorWizardState>) => void;
  onUpdateConfig: (p: Partial<CompetitorConfig>) => void;
  onUpdateScrapeSettings: (
    p: Partial<CompetitorConfig["scrapeSettings"]>
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="comp-name">Automation Name *</Label>
        <Input
          id="comp-name"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Track Nike Ads Weekly"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comp-brand">Competitor Brand Name *</Label>
        <Input
          id="comp-brand"
          value={state.config.brandName}
          onChange={(e) => onUpdateConfig({ brandName: e.target.value })}
          placeholder="e.g. Nike, Adidas, Allbirds"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comp-url">Meta Ads Library URL</Label>
        <Input
          id="comp-url"
          value={state.config.adsLibraryUrl}
          onChange={(e) => onUpdateConfig({ adsLibraryUrl: e.target.value })}
          placeholder="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&q=..."
        />
        {/* Helper box */}
        <div className="rounded-lg border bg-blue-50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <HelpCircle className="h-3.5 w-3.5" />
            How to get the Ads Library URL
          </div>
          <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
            <li>
              Go to{" "}
              <span className="font-medium">
                facebook.com/ads/library
              </span>
            </li>
            <li>
              Search for the competitor brand name
            </li>
            <li>
              Select the correct page from the results
            </li>
            <li>Copy the full URL from your browser and paste it above</li>
          </ol>
          <p className="text-[10px] text-blue-500">
            Tip: You can also filter by country, platform, and ad category
            before copying the URL.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comp-desc">Description</Label>
        <Textarea
          id="comp-desc"
          value={state.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Optional notes about this competitor..."
          rows={2}
        />
      </div>

      {/* Scrape Settings */}
      <div className="space-y-4 rounded-lg border p-4">
        <Label className="text-sm font-medium">Scrape Settings</Label>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="top-n" className="text-xs">
              Top N Ads
            </Label>
            <Input
              id="top-n"
              type="number"
              min={1}
              max={50}
              value={state.config.scrapeSettings.topN}
              onChange={(e) =>
                onUpdateScrapeSettings({
                  topN: Math.max(1, Math.min(50, Number(e.target.value))),
                })
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Impression Period</Label>
            <Select
              value={state.config.scrapeSettings.impressionPeriod}
              onValueChange={(v) =>
                onUpdateScrapeSettings({
                  impressionPeriod: v as ImpressionPeriod,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(IMPRESSION_PERIOD_LABELS) as ImpressionPeriod[]
                ).map((k) => (
                  <SelectItem key={k} value={k}>
                    {IMPRESSION_PERIOD_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Started Within</Label>
            <Select
              value={state.config.scrapeSettings.startedWithin}
              onValueChange={(v) =>
                onUpdateScrapeSettings({
                  startedWithin: v as StartedWithin,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(STARTED_WITHIN_LABELS) as StartedWithin[]
                ).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STARTED_WITHIN_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Notifications (reused from Performance) ──────────────────────

function StepNotify({
  state,
  onUpdate,
}: {
  state: CompetitorWizardState;
  onUpdate: (p: Partial<CompetitorWizardState>) => void;
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
            <Label htmlFor="comp-slack-channel">Slack Channel</Label>
            <Input
              id="comp-slack-channel"
              value={state.delivery.slackChannelName ?? ""}
              onChange={(e) =>
                onUpdate({
                  delivery: {
                    ...state.delivery,
                    slackChannelName: e.target.value,
                  },
                })
              }
              placeholder="#competitor-intel"
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

// ─── Step 3: Schedule (reused from Performance) ──────────────────────────

function StepSchedule({
  state,
  onUpdateSchedule,
  onToggleDay,
}: {
  state: CompetitorWizardState;
  onUpdateSchedule: (p: Partial<CompetitorWizardState["schedule"]>) => void;
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
        <Label htmlFor="comp-time">Time</Label>
        <Input
          id="comp-time"
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
