"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Sparkles,
  Download,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  TrendingUp,
  FileText,
  BarChart3,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getVideoBrandsAction,
  getDownloadedVideosAction,
  analyzeVideoAction,
  generateHooksMatrixAction,
} from "../actions";
import type {
  VideoAnalysisRecord,
  DownloadedVideoRecord,
} from "@/lib/data/video-analysis";
import type { HooksMatrixResult } from "@/lib/ai/hooks-generator";

// ─── Constants ────────────────────────────────────────────────────────────────

type Step = "select" | "configure" | "analyzing" | "generate" | "results";

const HOOK_TYPE_COLORS: Record<string, string> = {
  curiosity: "bg-blue-100 text-blue-700",
  pain_point: "bg-red-100 text-red-700",
  social_proof: "bg-green-100 text-green-700",
  urgency: "bg-orange-100 text-orange-700",
  contrarian: "bg-purple-100 text-purple-700",
  authority: "bg-indigo-100 text-indigo-700",
  storytelling: "bg-pink-100 text-pink-700",
  shock: "bg-rose-100 text-rose-700",
  question: "bg-cyan-100 text-cyan-700",
  statistic: "bg-teal-100 text-teal-700",
};

const ALL_STRATEGIES = [
  "curiosity",
  "pain_point",
  "social_proof",
  "urgency",
  "contrarian",
  "authority",
  "storytelling",
  "statistic",
] as const;

const STRATEGY_LABELS: Record<string, string> = {
  curiosity: "Curiosity",
  pain_point: "Pain Point",
  social_proof: "Social Proof",
  urgency: "Urgency",
  contrarian: "Contrarian",
  authority: "Authority",
  storytelling: "Storytelling",
  statistic: "Statistic",
};

const STEP_ORDER: Step[] = [
  "select",
  "configure",
  "analyzing",
  "generate",
  "results",
];

const STEP_LABELS: Record<Step, string> = {
  select: "Select Brands",
  configure: "Configure",
  analyzing: "Analyzing",
  generate: "Generate Hooks",
  results: "Results",
};

const CREDITS: Record<string, Record<string, number>> = {
  gemini: { quick: 2, detailed: 5 },
  gpt4o: { quick: 5, detailed: 10 },
};

// ─── Helper: scroll-stop score color ─────────────────────────────────────────

function scrollStopColor(score: number): string {
  if (score <= 3) return "text-red-600";
  if (score <= 6) return "text-yellow-600";
  return "text-emerald-600";
}

// ─── Helper: export functions ─────────────────────────────────────────────────

function exportCsv(hooks: HooksMatrixResult["hooks"]) {
  const header =
    "competitor_reference,hook_type,hook_text,rationale,target_emotion,suggested_format";
  const rows = hooks.map((h) =>
    [
      h.competitor_reference,
      h.hook_type,
      `"${h.hook_text.replace(/"/g, '""')}"`,
      `"${h.rationale.replace(/"/g, '""')}"`,
      h.target_emotion,
      h.suggested_format,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hooks-matrix.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson(result: HooksMatrixResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hooks-matrix.json";
  a.click();
  URL.revokeObjectURL(url);
}

function exportMarkdown(result: HooksMatrixResult) {
  const lines: string[] = [
    "# Hooks Matrix",
    "",
    `Generated: ${new Date().toLocaleDateString()}`,
    "",
    "## Hooks",
    "",
    "| # | Competitor | Type | Hook | Emotion | Format |",
    "|---|-----------|------|------|---------|--------|",
    ...result.hooks.map(
      (h, i) =>
        `| ${i + 1} | ${h.competitor_reference} | ${h.hook_type} | ${h.hook_text} | ${h.target_emotion} | ${h.suggested_format} |`
    ),
    "",
    "## Creative Briefs",
    "",
    ...result.creative_briefs.map(
      (b) =>
        `### ${b.title}\n\n**Hook:** ${b.hook}\n\n**Body:** ${b.body}\n\n**CTA:** ${b.cta}\n\n**Format:** ${b.format}\n\n**Visual Direction:** ${b.visual_direction}\n\n**Competitor Inspiration:** ${b.competitor_inspiration}\n\n---\n`
    ),
    "## Competitive Insights",
    "",
    "### Patterns",
    ...result.competitive_insights.patterns.map((p) => `- ${p}`),
    "",
    "### Gaps",
    ...result.competitive_insights.gaps.map((g) => `- ${g}`),
    "",
    "### Recommendations",
    ...result.competitive_insights.recommendations.map((r) => `- ${r}`),
  ];
  const md = lines.join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hooks-matrix.md";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {STEP_ORDER.map((s, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                isCompleted
                  ? "bg-emerald-600 text-white"
                  : isCurrent
                  ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? <CheckCircle className="size-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                isCurrent
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoAnalysisClient() {
  // Step
  const [step, setStep] = useState<Step>("select");
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 — brand selection
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandVideos, setBrandVideos] = useState<
    Record<string, DownloadedVideoRecord[]>
  >({});
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Step 2 — configure
  const [provider, setProvider] = useState<"gemini" | "gpt4o">("gemini");
  const [depth, setDepth] = useState<"quick" | "detailed">("quick");

  // Step 3 — analyzing
  const [analyses, setAnalyses] = useState<VideoAnalysisRecord[]>([]);
  const [analyzingProgress, setAnalyzingProgress] = useState({
    completed: 0,
    total: 0,
    failed: 0,
  });

  // Step 4 — generate
  const [yourBrandName, setYourBrandName] = useState("");
  const [yourBrandDesc, setYourBrandDesc] = useState("");
  const [yourBrandAudience, setYourBrandAudience] = useState("");
  const [hookCount, setHookCount] = useState<number>(45);
  const [hookCountMode, setHookCountMode] = useState<"15" | "30" | "45" | "custom">("45");
  const [customHookCount, setCustomHookCount] = useState("45");
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    ...ALL_STRATEGIES,
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 5 — results
  const [hooksResult, setHooksResult] = useState<HooksMatrixResult | null>(
    null
  );
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");

  // ── Load brands on mount ───────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setBrandsLoading(true);
      const result = await getVideoBrandsAction();
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setAvailableBrands(result.data);
        // Fetch video counts for each brand
        const counts: Record<string, DownloadedVideoRecord[]> = {};
        await Promise.all(
          result.data.map(async (brand) => {
            const v = await getDownloadedVideosAction(brand);
            counts[brand] = v.data ?? [];
          })
        );
        setBrandVideos(counts);
      }
      setBrandsLoading(false);
    }
    load();
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────

  const totalVideosSelected = selectedBrands.reduce(
    (sum, b) => sum + (brandVideos[b]?.length ?? 0),
    0
  );

  const creditCostPerVideo = CREDITS[provider]?.[depth] ?? 2;
  const totalAnalysisCost = totalVideosSelected * creditCostPerVideo;

  const allVideosForSelected = selectedBrands.flatMap(
    (b) => brandVideos[b] ?? []
  );

  // ── Strategy toggle ────────────────────────────────────────────────────────

  const toggleStrategy = useCallback((strategy: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(strategy)
        ? prev.filter((s) => s !== strategy)
        : [...prev, strategy]
    );
  }, []);

  // ── Hook count handling ────────────────────────────────────────────────────

  function handleHookCountMode(mode: "15" | "30" | "45" | "custom") {
    setHookCountMode(mode);
    if (mode !== "custom") {
      setHookCount(parseInt(mode));
    }
  }

  function handleCustomHookCount(val: string) {
    setCustomHookCount(val);
    const n = parseInt(val);
    if (!isNaN(n) && n >= 5 && n <= 100) {
      setHookCount(n);
    }
  }

  // ── Run analysis ───────────────────────────────────────────────────────────

  async function runAnalysis() {
    if (allVideosForSelected.length === 0) return;

    setStep("analyzing");
    setAnalyses([]);
    setAnalyzingProgress({
      completed: 0,
      total: allVideosForSelected.length,
      failed: 0,
    });

    let completed = 0;
    let failed = 0;

    for (const video of allVideosForSelected) {
      const result = await analyzeVideoAction({
        videoUrl: video.storage_url ?? "",
        brandName: video.brand_name,
        downloadedMediaId: video.id,
        provider,
        depth,
      });

      if (result.data) {
        setAnalyses((prev) => [...prev, result.data!]);
        completed++;
      } else {
        // Push a failed placeholder
        setAnalyses((prev) => [
          ...prev,
          {
            id: video.id,
            brand_name: video.brand_name,
            video_url: video.storage_url ?? "",
            processing_status: "failed",
            error_message: result.error,
          } as unknown as VideoAnalysisRecord,
        ]);
        failed++;
      }

      setAnalyzingProgress({
        completed: completed + failed,
        total: allVideosForSelected.length,
        failed,
      });
    }

    toast.success(
      `Analysis complete: ${completed} succeeded, ${failed} failed`
    );
  }

  // ── Generate hooks ─────────────────────────────────────────────────────────

  async function runGenerateHooks() {
    if (!yourBrandName.trim() || !yourBrandDesc.trim()) {
      toast.error("Brand name and product description are required.");
      return;
    }
    if (selectedStrategies.length === 0) {
      toast.error("Select at least one hook strategy.");
      return;
    }

    setIsGenerating(true);
    const result = await generateHooksMatrixAction({
      competitorBrands: selectedBrands,
      yourBrand: {
        name: yourBrandName.trim(),
        product_description: yourBrandDesc.trim(),
        target_audience: yourBrandAudience.trim() || undefined,
      },
      hookCount,
      strategies: selectedStrategies as ("curiosity" | "pain_point" | "social_proof" | "urgency" | "contrarian" | "authority" | "storytelling" | "statistic")[],
    });
    setIsGenerating(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data?.result) {
      setHooksResult(result.data.result as HooksMatrixResult);
      setStep("results");
      toast.success("Hooks matrix generated!");
    }
  }

  // ── Filtered hooks ─────────────────────────────────────────────────────────

  const filteredHooks = (hooksResult?.hooks ?? []).filter((h) => {
    if (filterBrand !== "all" && h.competitor_reference !== filterBrand)
      return false;
    if (filterType !== "all" && h.hook_type !== filterType) return false;
    if (filterFormat !== "all" && h.suggested_format !== filterFormat)
      return false;
    return true;
  });

  const uniqueFormats = Array.from(
    new Set((hooksResult?.hooks ?? []).map((h) => h.suggested_format))
  );

  const uniqueTypes = Array.from(
    new Set((hooksResult?.hooks ?? []).map((h) => h.hook_type))
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Video Ad Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze competitor video ads with AI and generate hooks for your
            brand
          </p>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* ── STEP 1: Select Brands ──────────────────────────────────────────── */}
      {step === "select" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Select Competitor Brands
              </CardTitle>
              <CardDescription>
                Choose which competitor brands to analyze. Only brands with
                downloaded videos are shown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Loading brands...</span>
                </div>
              ) : availableBrands.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Play className="size-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No downloaded videos yet
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Download competitor videos from the Discover page first.
                    They will appear here once downloaded.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableBrands.map((brand) => {
                    const videos = brandVideos[brand] ?? [];
                    const isSelected = selectedBrands.includes(brand);
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() =>
                          setSelectedBrands((prev) =>
                            isSelected
                              ? prev.filter((b) => b !== brand)
                              : [...prev, brand]
                          )
                        }
                        className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            setSelectedBrands((prev) =>
                              isSelected
                                ? prev.filter((b) => b !== brand)
                                : [...prev, brand]
                            )
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {brand}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {videos.length}{" "}
                            {videos.length === 1 ? "video" : "videos"} available
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBrands.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedBrands.length}{" "}
                {selectedBrands.length === 1 ? "brand" : "brands"} selected —{" "}
                {totalVideosSelected} videos total
              </p>
              <Button
                onClick={() => setStep("configure")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Configure Analysis
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Configure ─────────────────────────────────────────────── */}
      {step === "configure" && (
        <div className="space-y-4">
          {/* Provider */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI Provider</CardTitle>
              <CardDescription>
                Choose the AI model for video analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "gemini" as const,
                  name: "Gemini Flash 2.0",
                  description:
                    "Recommended — native video, fastest, most cost-effective",
                  icon: Zap,
                  costQuick: 2,
                  costDetailed: 5,
                },
                {
                  id: "gpt4o" as const,
                  name: "GPT-4o Vision",
                  description:
                    "Premium — deeper marketing analysis via GPT-4o refinement",
                  icon: Brain,
                  costQuick: 5,
                  costDetailed: 10,
                },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-md shrink-0 ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.costQuick} credits (quick) /{" "}
                        {p.costDetailed} credits (detailed)
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Depth */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Analysis Depth</CardTitle>
              <CardDescription>
                Choose how thorough the analysis should be
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "quick" as const,
                  name: "Quick",
                  description: "Hook + CTA — fast, great for bulk analysis",
                },
                {
                  id: "detailed" as const,
                  name: "Detailed",
                  description:
                    "Full narrative breakdown — hook, body, CTA, brand elements",
                },
              ].map((d) => {
                const isSelected = depth === d.id;
                const cost = CREDITS[provider]?.[d.id] ?? 2;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDepth(d.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{d.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {cost} credits/video
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Credit preview */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="flex items-center justify-between py-4">
              <div className="text-sm text-emerald-800">
                <span className="font-medium">{totalVideosSelected} videos</span>
                {" × "}
                <span className="font-medium">{creditCostPerVideo} credits</span>
                {" = "}
                <span className="font-bold text-emerald-700">
                  {totalAnalysisCost} credits
                </span>{" "}
                total for analysis
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("select")}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={runAnalysis}
                >
                  <Play className="size-3.5 mr-1.5" />
                  Analyze Videos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 3: Analyzing ─────────────────────────────────────────────── */}
      {step === "analyzing" && (
        <div className="space-y-4">
          {/* Progress header */}
          <Card>
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  Analyzing videos...
                </span>
                <span className="font-semibold">
                  {analyzingProgress.completed} / {analyzingProgress.total}
                </span>
              </div>
              <Progress
                value={
                  analyzingProgress.total > 0
                    ? (analyzingProgress.completed / analyzingProgress.total) *
                      100
                    : 0
                }
                className="h-2"
              />
              {analyzingProgress.failed > 0 && (
                <p className="text-xs text-red-600">
                  {analyzingProgress.failed} failed
                </p>
              )}
            </CardContent>
          </Card>

          {/* Analysis result cards */}
          <div className="grid grid-cols-1 gap-3">
            {analyses.map((a) => {
              const completed = a.processing_status === "completed";
              const failed = a.processing_status === "failed";
              const hookTypeColor =
                HOOK_TYPE_COLORS[a.hook?.type ?? ""] ?? "bg-gray-100 text-gray-700";
              const score = a.hook?.scroll_stop_score ?? 0;

              return (
                <Card
                  key={a.id}
                  className={`border-l-4 ${
                    completed
                      ? "border-l-emerald-500"
                      : failed
                      ? "border-l-red-500"
                      : "border-l-yellow-400"
                  }`}
                >
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {completed ? (
                          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                        ) : failed ? (
                          <XCircle className="size-4 text-red-500 shrink-0" />
                        ) : (
                          <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {a.brand_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {completed && a.hook?.type && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${hookTypeColor}`}
                          >
                            {a.hook.type.replace(/_/g, " ")}
                          </span>
                        )}
                        {completed && score > 0 && (
                          <span
                            className={`text-xs font-bold ${scrollStopColor(score)}`}
                          >
                            {score}/10
                          </span>
                        )}
                        {failed && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {completed && a.hook?.text && (
                      <blockquote className="border-l-2 border-muted pl-3 text-sm text-muted-foreground italic">
                        "{a.hook.text}"
                      </blockquote>
                    )}

                    {completed && a.cta && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          CTA:
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {typeof a.cta === "string"
                            ? a.cta
                            : (a.cta as { text?: string }).text ?? ""}
                        </Badge>
                      </div>
                    )}

                    {completed && a.competitive_insight && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {typeof a.competitive_insight === "string"
                          ? a.competitive_insight
                          : ""}
                      </p>
                    )}

                    {failed && a.error_message && (
                      <p className="text-xs text-red-500">{a.error_message}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Proceed button when done */}
          {analyzingProgress.completed === analyzingProgress.total &&
            analyzingProgress.total > 0 && (
              <div className="flex justify-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setStep("generate")}
                >
                  <Sparkles className="size-4 mr-1.5" />
                  Generate Hooks Matrix
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            )}
        </div>
      )}

      {/* ── STEP 4: Generate Hooks ─────────────────────────────────────────── */}
      {step === "generate" && (
        <div className="space-y-4">
          {/* Your brand */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Brand</CardTitle>
              <CardDescription>
                Tell us about your brand so we can generate hooks tailored to
                you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">
                  Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brand-name"
                  placeholder="e.g. Acme Co."
                  value={yourBrandName}
                  onChange={(e) => setYourBrandName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand-desc">
                  Product Description{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="brand-desc"
                  placeholder="Describe your product or service in detail — what it does, who it's for, what problems it solves..."
                  value={yourBrandDesc}
                  onChange={(e) => setYourBrandDesc(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {yourBrandDesc.length}/2000
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand-audience">
                  Target Audience{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="brand-audience"
                  placeholder="e.g. Fitness enthusiasts aged 25-40 in the US"
                  value={yourBrandAudience}
                  onChange={(e) => setYourBrandAudience(e.target.value)}
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hook count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hook Count</CardTitle>
              <CardDescription>
                How many hooks should we generate?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {(["15", "30", "45"] as const).map((n) => (
                  <Button
                    key={n}
                    variant={hookCountMode === n ? "default" : "outline"}
                    size="sm"
                    className={
                      hookCountMode === n
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : ""
                    }
                    onClick={() => handleHookCountMode(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant={hookCountMode === "custom" ? "default" : "outline"}
                  size="sm"
                  className={
                    hookCountMode === "custom"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : ""
                  }
                  onClick={() => handleHookCountMode("custom")}
                >
                  Custom
                </Button>
                {hookCountMode === "custom" && (
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={customHookCount}
                    onChange={(e) => handleCustomHookCount(e.target.value)}
                    className="w-24 h-9"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Strategies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hook Strategies</CardTitle>
              <CardDescription>
                Select which persuasion strategies to include
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ALL_STRATEGIES.map((strategy) => {
                  const isSelected = selectedStrategies.includes(strategy);
                  const colorClass =
                    HOOK_TYPE_COLORS[strategy] ?? "bg-gray-100 text-gray-700";
                  return (
                    <button
                      key={strategy}
                      type="button"
                      onClick={() => toggleStrategy(strategy)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleStrategy(strategy)}
                        className="shrink-0"
                      />
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}
                      >
                        {STRATEGY_LABELS[strategy]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Credit preview + generate */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm text-emerald-800">
                <span className="font-bold text-emerald-700">10 credits</span>{" "}
                for hooks matrix generation
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("analyzing")}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={runGenerateHooks}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 mr-1.5" />
                      Generate Hooks Matrix
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 5: Results ────────────────────────────────────────────────── */}
      {step === "results" && hooksResult && (
        <div className="space-y-4">
          <Tabs defaultValue="hooks">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hooks" className="gap-1.5">
                <BarChart3 className="size-3.5" />
                Hooks Matrix
                <Badge variant="secondary" className="text-xs ml-1">
                  {hooksResult.hooks.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="briefs" className="gap-1.5">
                <FileText className="size-3.5" />
                Creative Briefs
                <Badge variant="secondary" className="text-xs ml-1">
                  {hooksResult.creative_briefs?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5">
                <TrendingUp className="size-3.5" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* Hooks Matrix Tab */}
            <TabsContent value="hooks" className="space-y-3 mt-4">
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2 items-center">
                <Filter className="size-4 text-muted-foreground shrink-0" />
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {selectedBrands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="All hook types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All hook types</SelectItem>
                    {uniqueTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterFormat} onValueChange={setFilterFormat}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="All formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All formats</SelectItem>
                    {uniqueFormats.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground ml-auto">
                  {filteredHooks.length} hooks
                </p>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Competitor</TableHead>
                      <TableHead>Hook Type</TableHead>
                      <TableHead>Hook Text</TableHead>
                      <TableHead>Emotion</TableHead>
                      <TableHead>Format</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHooks.map((h, i) => {
                      const colorClass =
                        HOOK_TYPE_COLORS[h.hook_type] ??
                        "bg-gray-100 text-gray-700";
                      return (
                        <TableRow key={i} className="align-top">
                          <TableCell className="text-muted-foreground text-xs py-3">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-xs py-3 font-medium max-w-[120px] truncate">
                            {h.competitor_reference}
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colorClass}`}
                            >
                              {h.hook_type.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm py-3 max-w-xs">
                            <p>{h.hook_text}</p>
                            {h.rationale && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {h.rationale}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground capitalize">
                            {h.target_emotion}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs">
                              {h.suggested_format}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredHooks.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          No hooks match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Creative Briefs Tab */}
            <TabsContent value="briefs" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(hooksResult.creative_briefs ?? []).map((brief, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{brief.title}</CardTitle>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {brief.format}
                        </Badge>
                        {brief.competitor_inspiration && (
                          <Badge variant="secondary" className="text-xs">
                            Inspired by {brief.competitor_inspiration}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Hook
                        </p>
                        <p className="text-sm">{brief.hook}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Body Copy
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {brief.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            CTA
                          </p>
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">
                            {brief.cta}
                          </Badge>
                        </div>
                      </div>
                      {brief.visual_direction && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Visual Direction
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {brief.visual_direction}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(hooksResult.creative_briefs ?? []).length === 0 && (
                  <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                    No creative briefs generated.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Competitive Insights Tab */}
            <TabsContent value="insights" className="mt-4 space-y-4">
              {hooksResult.competitive_insights?.summary && (
                <Card className="bg-muted/40">
                  <CardContent className="py-4">
                    <p className="text-sm leading-relaxed">
                      {hooksResult.competitive_insights.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patterns */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-600" />
                      Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(
                        hooksResult.competitive_insights?.patterns ?? []
                      ).map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-emerald-600 shrink-0 font-bold">
                            ·
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                      {(hooksResult.competitive_insights?.patterns ?? [])
                        .length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          No patterns identified.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                {/* Gaps */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <XCircle className="size-4 text-yellow-500" />
                      Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(
                        hooksResult.competitive_insights?.gaps ?? []
                      ).map((g, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-yellow-500 shrink-0 font-bold">
                            ·
                          </span>
                          <span>{g}</span>
                        </li>
                      ))}
                      {(hooksResult.competitive_insights?.gaps ?? []).length ===
                        0 && (
                        <li className="text-sm text-muted-foreground">
                          No gaps identified.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="size-4 text-blue-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(
                        hooksResult.competitive_insights?.recommendations ?? []
                      ).map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-blue-500 shrink-0 font-bold">
                            ·
                          </span>
                          <span>{r}</span>
                        </li>
                      ))}
                      {(
                        hooksResult.competitive_insights?.recommendations ?? []
                      ).length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          No recommendations available.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── STICKY EXPORT BAR ──────────────────────────────────────────────── */}
      {step === "results" && hooksResult && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-muted-foreground">
              {hooksResult.hooks.length} hooks generated
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(hooksResult.hooks)}
              >
                <Download className="size-3.5 mr-1.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportJson(hooksResult)}
              >
                <Download className="size-3.5 mr-1.5" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMarkdown(hooksResult)}
              >
                <Download className="size-3.5 mr-1.5" />
                Markdown
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
