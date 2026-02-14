"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Check, ChevronsUpDown, Loader2, Globe } from "lucide-react";
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
import { useWorkspace } from "@/lib/hooks/use-workspace";
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
      setSaved(true);
      router.refresh();
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
