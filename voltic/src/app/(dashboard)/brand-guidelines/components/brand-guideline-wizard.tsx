"use client";

import { useState, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPaletteEditor } from "./color-palette-editor";
import {
  createBrandGuidelineAction,
  uploadBrandGuidelineFilesAction,
  generateBrandGuidelinesAIAction,
  updateBrandGuidelineAction,
} from "../actions";
import { LLM_MODELS } from "@/types/creative-studio";
import type { LLMProvider } from "@/types/creative-studio";
import type { ColorSwatch, Typography } from "@/types/brand-guidelines";

interface BrandGuidelineWizardProps {
  onCancel: () => void;
  onComplete: (id: string) => void;
}

type WizardStep = "name" | "upload" | "generate" | "review";

export function BrandGuidelineWizard({ onCancel, onComplete }: BrandGuidelineWizardProps) {
  const [step, setStep] = useState<WizardStep>("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Name
  const [name, setName] = useState("");

  // Step 2: Upload
  const [guidelineId, setGuidelineId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; path: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: LLM Selection
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0]);

  // Step 4: AI Results (editable)
  const [brandName, setBrandName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [colorPalette, setColorPalette] = useState<ColorSwatch[]>([]);
  const [typography, setTypography] = useState<Typography>({});
  const [targetAudience, setTargetAudience] = useState("");
  const [dosAndDonts, setDosAndDonts] = useState("");

  // ── Step 1: Create guideline with name ────────────────────────────────────
  const handleCreateGuideline = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createBrandGuidelineAction({ name: name.trim() });
    if (!result.success || !result.id) {
      setError(result.error ?? "Failed to create");
      setLoading(false);
      return;
    }

    setGuidelineId(result.id);
    setLoading(false);
    setStep("upload");
  };

  // ── Step 2: Upload images (batch) ────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !guidelineId) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("guidelineId", guidelineId);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    const result = await uploadBrandGuidelineFilesAction(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.files) {
      setUploadedFiles((prev) => [
        ...prev,
        ...result.files!.map((f) => ({ name: f.name, url: f.url, path: f.path })),
      ]);
      if (result.errors && result.errors.length > 0) {
        setError(`Some files failed: ${result.errors.join(", ")}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedFile = (path: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.path !== path));
  };

  // ── Step 3: Generate with AI ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!guidelineId) return;

    const imageUrls = uploadedFiles
      .filter((f) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f.name))
      .map((f) => f.url);

    if (imageUrls.length === 0) {
      setError("Upload at least one image for AI analysis");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await generateBrandGuidelinesAIAction({
      guidelineId,
      provider: selectedModel.provider,
      model: selectedModel.model,
      imageUrls,
    });

    if (!result.success || !result.data) {
      setError(result.error ?? "AI generation failed");
      setLoading(false);
      return;
    }

    // Populate review fields
    setBrandName(result.data.brandName);
    setBrandVoice(result.data.brandVoice);
    setColorPalette(result.data.colorPalette);
    setTypography(result.data.typography);
    setTargetAudience(result.data.targetAudience);
    setDosAndDonts(result.data.dosAndDonts);

    setLoading(false);
    setStep("review");
  };

  // ── Step 4: Save final results ────────────────────────────────────────────
  const handleSaveReview = async () => {
    if (!guidelineId) return;

    setLoading(true);
    setError(null);

    const result = await updateBrandGuidelineAction({
      id: guidelineId,
      name: name.trim(),
      brandName: brandName.trim() || undefined,
      brandVoice: brandVoice.trim() || undefined,
      colorPalette,
      typography,
      targetAudience: targetAudience.trim() || undefined,
      dosAndDonts: dosAndDonts.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete(guidelineId);
  };

  // ── Skip AI and go to manual ──────────────────────────────────────────────
  const handleSkipAI = () => {
    if (guidelineId) {
      onComplete(guidelineId);
    }
  };

  const steps: { key: WizardStep; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "upload", label: "Upload" },
    { key: "generate", label: "AI Generate" },
    { key: "review", label: "Review" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="size-4 mr-1" />
            Cancel
          </Button>
          <h2 className="text-xl font-bold">Create Brand Guidelines</h2>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`size-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < currentStepIndex
                  ? "bg-emerald-600 text-white"
                  : i === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStepIndex ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === currentStepIndex ? "font-semibold" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Name */}
      {step === "name" && (
        <Card>
          <CardHeader>
            <CardTitle>Name your brand guidelines</CardTitle>
            <p className="text-sm text-muted-foreground">
              Give a descriptive name (e.g., &ldquo;Sunday Brand&rdquo;, &ldquo;Q1 Campaign Style&rdquo;).
              This creates a slug for @mention references.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Brand"
              maxLength={100}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGuideline()}
              autoFocus
            />
            {name.trim() && (
              <p className="text-xs text-muted-foreground">
                Mention as: <code className="bg-muted px-1 rounded">@{name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}</code>
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={handleCreateGuideline} disabled={loading || !name.trim()}>
                {loading ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 mr-1" />
                )}
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload brand materials</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload your logos, brandbook pages, ad examples, or any visual materials.
              AI will analyze these to generate brand guidelines.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.pdf"
              multiple
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-8 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="size-8" />
                  <span className="text-sm font-medium">Click to upload images</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF, SVG, PDF — up to 20MB each</span>
                </>
              )}
            </button>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-muted/50"
                  >
                    {/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={file.name}
                        className="size-10 rounded object-cover border"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <Upload className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => removeUploadedFile(file.path)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleSkipAI}>
                Skip AI — Edit Manually
              </Button>
              <Button
                onClick={() => setStep("generate")}
                disabled={uploadedFiles.length === 0}
              >
                <ArrowRight className="size-4 mr-1" />
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: LLM Selection + Generate */}
      {step === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle>Select AI Model</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose which AI model will analyze your brand materials and generate guidelines.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={`${selectedModel.provider}:${selectedModel.model}`}
              onValueChange={(val) => {
                const found = LLM_MODELS.find(
                  (m) => `${m.provider}:${m.model}` === val
                );
                if (found) setSelectedModel(found);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_MODELS.filter((m) => m.supportsVision).map((m) => (
                  <SelectItem key={`${m.provider}:${m.model}`} value={`${m.provider}:${m.model}`}>
                    {m.label} — {m.description} ({m.creditCost} credits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p>
                <strong>{selectedModel.label}</strong> will analyze{" "}
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} and
                extract brand name, voice, colors, typography, audience, and rules.
              </p>
              <p className="mt-1">Cost: <strong>5 credits</strong></p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="size-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-1" />
                    Generate Guidelines
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review / Edit AI Results */}
      {step === "review" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review AI-Generated Guidelines</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and edit the AI-generated brand guidelines before saving.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Heading Font</label>
                  <Input
                    value={typography.headingFont ?? ""}
                    onChange={(e) =>
                      setTypography({ ...typography, headingFont: e.target.value || undefined })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Voice</label>
                <Textarea
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color Palette</label>
                <ColorPaletteEditor value={colorPalette} onChange={setColorPalette} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Do&apos;s &amp; Don&apos;ts</label>
                <Textarea
                  value={dosAndDonts}
                  onChange={(e) => setDosAndDonts(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("generate")}>
                  <ArrowLeft className="size-4 mr-1" />
                  Re-generate
                </Button>
                <Button onClick={handleSaveReview} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 mr-1" />
                      Save Guidelines
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
