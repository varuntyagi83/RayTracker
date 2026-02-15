"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Download,
  Upload,
  Trash2,
  Star,
  Loader2,
  FileText,
  ImageIcon,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPaletteEditor } from "./color-palette-editor";
import {
  updateBrandGuidelineAction,
  deleteBrandGuidelineFileAction,
  setDefaultBrandGuidelineAction,
  regenerateBrandGuidelinesPreviewAction,
} from "../actions";
import { LLM_MODELS } from "@/types/creative-studio";
import type { BrandGuidelineEntity, ColorSwatch, Typography } from "@/types/brand-guidelines";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface BrandGuidelineEditorProps {
  guideline: BrandGuidelineEntity;
  onBack: () => void;
  onUpdated: () => void;
}

export function BrandGuidelineEditor({
  guideline,
  onBack,
  onUpdated,
}: BrandGuidelineEditorProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // AI regenerate state
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0]);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Form state
  const [name, setName] = useState(guideline.name);
  const [brandName, setBrandName] = useState(guideline.brandName ?? "");
  const [brandVoice, setBrandVoice] = useState(guideline.brandVoice ?? "");
  const [colorPalette, setColorPalette] = useState<ColorSwatch[]>(guideline.colorPalette);
  const [typography, setTypography] = useState<Typography>(guideline.typography);
  const [targetAudience, setTargetAudience] = useState(guideline.targetAudience ?? "");
  const [dosAndDonts, setDosAndDonts] = useState(guideline.dosAndDonts ?? "");
  const [logoUrl, setLogoUrl] = useState(guideline.logoUrl);
  const [files, setFiles] = useState(guideline.files);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const result = await updateBrandGuidelineAction({
      id: guideline.id,
      name: name.trim(),
      brandName: brandName.trim() || undefined,
      brandVoice: brandVoice.trim() || undefined,
      colorPalette,
      typography,
      targetAudience: targetAudience.trim() || undefined,
      dosAndDonts: dosAndDonts.trim() || undefined,
    });

    setSaving(false);
    if (result.success) {
      setSaved(true);
      onUpdated();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("guidelineId", guideline.id);
      formData.append("type", "logo");
      formData.append("file", file);

      const res = await fetch("/api/brand-guidelines/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.url) {
        setLogoUrl(result.url);
        onUpdated();
      }
    } catch {
      toast.error("Logo upload failed. Please try again.");
    }

    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("guidelineId", guideline.id);
      formData.append("type", "files");
      formData.append("files", file);

      const res = await fetch("/api/brand-guidelines/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.files?.[0]) {
        setFiles((prev) => [...prev, result.files[0]]);
        onUpdated();
      }
    } catch {
      toast.error("File upload failed. Please try again.");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (filePath: string) => {
    const result = await deleteBrandGuidelineFileAction({
      id: guideline.id,
      filePath,
    });
    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.path !== filePath));
      onUpdated();
    }
  };

  const handleSetDefault = async () => {
    await setDefaultBrandGuidelineAction({ id: guideline.id });
    onUpdated();
  };

  const handleDownloadPDF = () => {
    window.open(`/api/brand-guidelines/${guideline.id}/pdf`, "_blank");
  };

  const hasImages = files.some((f) => f.type.startsWith("image/"));

  const handleRegenerate = async () => {
    setGenerating(true);
    setAiError(null);
    setAiLoaded(false);

    const result = await regenerateBrandGuidelinesPreviewAction({
      guidelineId: guideline.id,
      provider: selectedModel.provider,
      model: selectedModel.model,
    });

    setGenerating(false);

    if (!result.success || !result.data) {
      setAiError(result.error ?? "AI generation failed");
      return;
    }

    // Populate form fields with AI results
    setBrandName(result.data.brandName);
    setBrandVoice(result.data.brandVoice);
    setColorPalette(result.data.colorPalette);
    setTypography(result.data.typography);
    setTargetAudience(result.data.targetAudience);
    setDosAndDonts(result.data.dosAndDonts);
    setAiLoaded(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{guideline.name}</h2>
            <p className="text-sm text-muted-foreground">@{guideline.slug}</p>
          </div>
          {guideline.isDefault && (
            <Badge variant="secondary">Default</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!guideline.isDefault && (
            <Button variant="outline" size="sm" onClick={handleSetDefault}>
              <Star className="size-4 mr-1" />
              Set Default
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="size-4 mr-1" />
            PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4 mr-1" />
                Save
              </>
            )}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600">Saved</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Guideline Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sunday Brand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Sunday"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Voice</label>
                <Textarea
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="Describe the tone, personality, and communication style..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who are your ideal customers?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Do&apos;s &amp; Don&apos;ts</label>
                <Textarea
                  value={dosAndDonts}
                  onChange={(e) => setDosAndDonts(e.target.value)}
                  placeholder="Do: Use active voice&#10;Don't: Use ALL CAPS"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Color Palette</CardTitle>
            </CardHeader>
            <CardContent>
              <ColorPaletteEditor
                value={colorPalette}
                onChange={setColorPalette}
              />
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Heading Font</label>
                  <Input
                    value={typography.headingFont ?? ""}
                    onChange={(e) =>
                      setTypography({ ...typography, headingFont: e.target.value || undefined })
                    }
                    placeholder="e.g. Inter, Montserrat"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Body Font</label>
                  <Input
                    value={typography.bodyFont ?? ""}
                    onChange={(e) =>
                      setTypography({ ...typography, bodyFont: e.target.value || undefined })
                    }
                    placeholder="e.g. Open Sans, Lato"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Logo + Files */}
        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={logoInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
              />
              {logoUrl ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted p-4 flex items-center justify-center">
                    <Image src={logoUrl || "/placeholder.svg"} alt="Brand logo" width={200} height={200} className="max-h-32 max-w-full object-contain" unoptimized />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="size-4 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-1" />
                        Change Logo
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  {uploadingLogo ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-6" />
                      <span className="text-sm">Upload logo</span>
                    </>
                  )}
                </button>
              )}
            </CardContent>
          </Card>

          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Assets</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload brand reference files (max 10 files, 20MB each)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.svg,.webp"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || files.length >= 10}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-1" />
                    Upload File
                  </>
                )}
              </Button>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteFile(file.path)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {files.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No files uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Regenerate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Regenerate
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Re-analyze uploaded images with AI to regenerate all fields.
                Review the results, then Save to keep.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={`${selectedModel.provider}:${selectedModel.model}`}
                onValueChange={(val) => {
                  const found = LLM_MODELS.find(
                    (m) => `${m.provider}:${m.model}` === val
                  );
                  if (found) setSelectedModel(found);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_MODELS.filter((m) => m.supportsVision).map((m) => (
                    <SelectItem
                      key={`${m.provider}:${m.model}`}
                      value={`${m.provider}:${m.model}`}
                    >
                      {m.label} ({m.creditCost} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={handleRegenerate}
                disabled={generating || !hasImages}
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-1" />
                    Regenerate
                  </>
                )}
              </Button>

              {!hasImages && (
                <p className="text-xs text-muted-foreground text-center">
                  Upload at least one image above to use AI
                </p>
              )}

              {aiError && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}

              {aiLoaded && (
                <p className="text-xs text-emerald-600">
                  AI results loaded — review the fields and Save to keep.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
