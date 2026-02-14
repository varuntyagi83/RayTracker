"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Check, ChevronsUpDown, Loader2, Globe, Chrome, Copy, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { track } from "@/lib/analytics/events";
import { createClient } from "@/lib/supabase/client";
import { updateWorkspaceTimezoneAction } from "../actions";

// ─── Timezone helpers ────────────────────────────────────────────────────────

function getUtcOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value ?? "";
  } catch {
    return "";
  }
}

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

function buildTimezoneOptions(): TimezoneOption[] {
  const allTimezones = Intl.supportedValuesOf("timeZone");
  return allTimezones.map((tz) => {
    const offset = getUtcOffset(tz);
    const region = tz.split("/")[0];
    const city = tz.split("/").slice(1).join("/").replace(/_/g, " ");
    return {
      value: tz,
      label: city ? `${city} (${offset})` : `${tz} (${offset})`,
      offset,
      region,
    };
  });
}

function groupByRegion(options: TimezoneOption[]): Record<string, TimezoneOption[]> {
  const groups: Record<string, TimezoneOption[]> = {};
  for (const opt of options) {
    if (!groups[opt.region]) groups[opt.region] = [];
    groups[opt.region].push(opt);
  }
  return groups;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsClient() {
  const { workspace } = useWorkspace();
  const router = useRouter();

  const [selectedTimezone, setSelectedTimezone] = useState(workspace.timezone);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // API Token state
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const fetchApiToken = useCallback(async () => {
    setTokenLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setApiToken(data.session?.access_token ?? null);
    } finally {
      setTokenLoading(false);
    }
  }, []);

  const copyToken = useCallback(async () => {
    if (!apiToken) return;
    await navigator.clipboard.writeText(apiToken);
    track("api_token_copied");
    setTokenCopied(true);
    toast.success("Token copied to clipboard");
    setTimeout(() => setTokenCopied(false), 2000);
  }, [apiToken]);

  const timezoneOptions = useMemo(() => buildTimezoneOptions(), []);
  const grouped = useMemo(() => groupByRegion(timezoneOptions), [timezoneOptions]);
  const regionOrder = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped]
  );

  // Reset saved indicator when timezone changes
  useEffect(() => {
    setSaved(false);
  }, [selectedTimezone]);

  const isDirty = selectedTimezone !== workspace.timezone;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    const result = await updateWorkspaceTimezoneAction({ timezone: selectedTimezone });
    setSaving(false);
    if (result.success) {
      track("settings_updated", { section: "timezone" });
      setSaved(true);
      toast.success("Settings saved");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save settings");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="brand-guidelines">Brand Guidelines</TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="size-5" />
                Timezone
              </CardTitle>
              <CardDescription>
                Set your workspace timezone. This affects how dates and times are
                displayed across dashboards and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                  >
                    {selectedTimezone
                      ? `${selectedTimezone} (${getUtcOffset(selectedTimezone)})`
                      : "Select timezone..."}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandList>
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      {regionOrder.map((region) => (
                        <CommandGroup key={region} heading={region}>
                          {grouped[region].map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={tz.value}
                              onSelect={(val) => {
                                setSelectedTimezone(val);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  selectedTimezone === tz.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{tz.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Timezone"
                  )}
                </Button>
                {saved && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <Check className="size-4" />
                    Timezone updated
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chrome Extension */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Chrome className="size-5" />
                Chrome Extension
              </CardTitle>
              <CardDescription>
                Connect the Voltic Chrome Extension to save ads directly from the
                Meta Ad Library to your boards. Copy the token below and paste it
                in the extension popup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiToken ? (
                <>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono truncate">
                      {tokenVisible
                        ? apiToken
                        : `${apiToken.slice(0, 20)}${"•".repeat(30)}`}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTokenVisible((v) => !v)}
                      title={tokenVisible ? "Hide token" : "Show token"}
                    >
                      {tokenVisible ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyToken}
                      title="Copy token"
                    >
                      {tokenCopied ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This token expires periodically. If the extension disconnects,
                    generate a fresh token and reconnect.
                  </p>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={fetchApiToken}
                  disabled={tokenLoading}
                >
                  {tokenLoading ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Reveal API Token"
                  )}
                </Button>
              )}

              {/* Setup Instructions */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Setup Instructions</h4>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    <span className="font-medium text-foreground">Install the extension</span>
                    {" "}&mdash; Open{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">chrome://extensions</code>,
                    enable <span className="font-medium">Developer mode</span>, click{" "}
                    <span className="font-medium">Load unpacked</span>, and select the{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">extension/</code> folder.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Connect</span>
                    {" "}&mdash; Click the Voltic icon in your Chrome toolbar, enter your app URL and
                    the API token from above, then click <span className="font-medium">Connect</span>.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Save ads</span>
                    {" "}&mdash; Go to{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">facebook.com/ads/library</code>{" "}
                    and search for any brand. A green banner confirms your connection.
                    Click <span className="font-medium">Save to Voltic</span> on any ad card,
                    pick a board, and the ad is saved instantly.
                  </li>
                </ol>
                <div className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    The API token expires periodically. If the extension shows
                    &ldquo;Not connected&rdquo;, reveal a fresh token here and
                    reconnect from the extension popup.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Brand Guidelines ────────────────────────────────────────── */}
        <TabsContent value="brand-guidelines" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Guidelines</CardTitle>
              <p className="text-sm text-muted-foreground">
                Brand guidelines have moved to their own dedicated page with
                AI-powered generation, multiple named guidelines, PDF export,
                and @mention support in Creative Studio.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/brand-guidelines">
                  <BookOpen className="mr-1.5 size-4" />
                  Manage Brand Guidelines
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
