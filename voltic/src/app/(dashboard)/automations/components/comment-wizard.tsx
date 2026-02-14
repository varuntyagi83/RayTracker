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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import {
  Slack,
  MessageCircle,
  Instagram,
  Facebook,
} from "lucide-react";
import { CommentPreview } from "./comment-preview";
import { createAutomation, updateAutomation } from "../actions";
import { track } from "@/lib/analytics/events";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  type CommentWizardState,
  type CommentDigestConfig,
  type CommentFrequency,
  type PostType,
  type PostAge,
  type FacebookPageRef,
  type Frequency,
  type DayOfWeek,
  type Automation,
  DEFAULT_COMMENT_CONFIG,
  DEFAULT_SCHEDULE,
  DEFAULT_DELIVERY,
  COMMENT_FREQUENCY_LABELS,
  POST_TYPE_LABELS,
  POST_AGE_LABELS,
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

interface CommentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAutomation?: Automation | null;
}

function initState(edit?: Automation | null): CommentWizardState {
  if (edit) {
    const config = edit.config as CommentDigestConfig;
    return {
      name: edit.name,
      description: edit.description ?? "",
      config: { ...DEFAULT_COMMENT_CONFIG, ...config },
      delivery: {
        ...DEFAULT_DELIVERY,
        ...(edit.delivery as CommentWizardState["delivery"]),
      },
      schedule: {
        ...DEFAULT_SCHEDULE,
        ...(edit.schedule as CommentWizardState["schedule"]),
      },
    };
  }
  return {
    name: "",
    description: "",
    config: { ...DEFAULT_COMMENT_CONFIG, pages: [] },
    delivery: { ...DEFAULT_DELIVERY },
    schedule: { ...DEFAULT_SCHEDULE },
  };
}

export function CommentWizard({
  open,
  onOpenChange,
  editAutomation,
}: CommentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<CommentWizardState>(() =>
    initState(editAutomation)
  );
  const [saving, setSaving] = useState(false);

  function update(partial: Partial<CommentWizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function updateConfig(partial: Partial<CommentDigestConfig>) {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
    }));
  }

  function updateSchedule(
    partial: Partial<CommentWizardState["schedule"]>
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
      wizard_type: "comments",
    });
    setStep((s) => Math.min(s + 1, 2));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleClose() {
    track("automation_wizard_abandoned", {
      step: STEPS[step],
      wizard_type: "comments",
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

  function togglePage(page: FacebookPageRef) {
    const current = state.config.pages;
    const exists = current.some((p) => p.id === page.id);
    const next = exists
      ? current.filter((p) => p.id !== page.id)
      : [...current, page];
    updateConfig({ pages: next });
  }

  async function handleSave(status: "draft" | "active") {
    setSaving(true);

    const payload = {
      name: state.name,
      description: state.description,
      type: "comments" as const,
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
      track("comment_automation_created", {
        status,
        page_count: state.config.pages.length,
        frequency: state.config.frequency,
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
            {editAutomation ? "Edit" : "Create"} Comment Digest
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
              <StepCommentBasics
                state={state}
                onUpdate={update}
                onUpdateConfig={updateConfig}
                onTogglePage={togglePage}
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
            <CommentPreview state={state} />
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

// ─── Step 1: Comment Basics ──────────────────────────────────────────────────

function StepCommentBasics({
  state,
  onUpdate,
  onUpdateConfig,
  onTogglePage,
}: {
  state: CommentWizardState;
  onUpdate: (p: Partial<CommentWizardState>) => void;
  onUpdateConfig: (p: Partial<CommentDigestConfig>) => void;
  onTogglePage: (page: FacebookPageRef) => void;
}) {
  const [availablePages, setAvailablePages] = useState<FacebookPageRef[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    async function loadPages() {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get workspace
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();

        if (!member) return;

        const { data: pages } = await supabase
          .from("facebook_pages")
          .select("id, page_id, page_name, has_instagram, instagram_handle")
          .eq("workspace_id", member.workspace_id)
          .order("page_name");

        if (pages) {
          setAvailablePages(
            pages.map((p) => ({
              id: p.id,
              pageId: p.page_id,
              pageName: p.page_name,
              hasInstagram: p.has_instagram,
              instagramHandle: p.instagram_handle,
            }))
          );
        }
      } catch {
        // Silently fail — pages will be empty
      } finally {
        setLoadingPages(false);
      }
    }
    loadPages();
  }, []);

  const selectedCount = state.config.pages.length;
  const igCount = state.config.pages.filter((p) => p.hasInstagram).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="comment-name">Name *</Label>
        <Input
          id="comment-name"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Daily Comment Digest"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment-desc">Description</Label>
        <Textarea
          id="comment-desc"
          value={state.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Optional notes about this digest..."
          rows={2}
        />
      </div>

      {/* Pages multi-select */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pages</Label>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount} page{selectedCount !== 1 ? "s" : ""}
              {igCount > 0 ? ` · ${igCount} with Instagram` : ""}
            </Badge>
          )}
        </div>

        {loadingPages ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading pages...
          </div>
        ) : availablePages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No Facebook Pages found in this workspace.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pages will appear here once connected via Meta integration.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border p-2">
            {availablePages.map((page) => {
              const isSelected = state.config.pages.some(
                (p) => p.id === page.id
              );
              return (
                <label
                  key={page.id}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50 border border-emerald-200"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onTogglePage(page)}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {page.pageName}
                    </span>
                    {page.hasInstagram && (
                      <div className="flex items-center gap-1 text-xs text-pink-600">
                        <Instagram className="h-3 w-3" />
                        {page.instagramHandle && (
                          <span>@{page.instagramHandle}</span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Filters */}
      <div className="space-y-4 rounded-lg border p-4">
        <Label className="text-sm font-medium">Post Filters</Label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Post Type</Label>
            <Select
              value={state.config.postFilters.postType}
              onValueChange={(v) =>
                onUpdateConfig({
                  postFilters: {
                    ...state.config.postFilters,
                    postType: v as PostType,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {POST_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Post Age</Label>
            <Select
              value={state.config.postFilters.postAge}
              onValueChange={(v) =>
                onUpdateConfig({
                  postFilters: {
                    ...state.config.postFilters,
                    postAge: v as PostAge,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(POST_AGE_LABELS) as PostAge[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {POST_AGE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Digest Frequency */}
      <div className="space-y-2">
        <Label>Digest Frequency</Label>
        <div className="flex gap-2">
          {(Object.keys(COMMENT_FREQUENCY_LABELS) as CommentFrequency[]).map(
            (f) => (
              <Toggle
                key={f}
                size="sm"
                pressed={state.config.frequency === f}
                onPressedChange={() => onUpdateConfig({ frequency: f })}
                className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
              >
                {COMMENT_FREQUENCY_LABELS[f]}
              </Toggle>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Notifications (reused) ──────────────────────────────────────────

function StepNotify({
  state,
  onUpdate,
}: {
  state: CommentWizardState;
  onUpdate: (p: Partial<CommentWizardState>) => void;
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
            <Label htmlFor="comment-slack-channel">Slack Channel</Label>
            <Input
              id="comment-slack-channel"
              value={state.delivery.slackChannelName ?? ""}
              onChange={(e) =>
                onUpdate({
                  delivery: {
                    ...state.delivery,
                    slackChannelName: e.target.value,
                  },
                })
              }
              placeholder="#social-comments"
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

// ─── Step 3: Schedule (reused) ───────────────────────────────────────────────

function StepSchedule({
  state,
  onUpdateSchedule,
  onToggleDay,
}: {
  state: CommentWizardState;
  onUpdateSchedule: (p: Partial<CommentWizardState["schedule"]>) => void;
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
        <Label htmlFor="comment-time">Time</Label>
        <Input
          id="comment-time"
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
