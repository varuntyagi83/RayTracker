"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, FileBarChart, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanySelector } from "./company-selector";
import { ReportViewer } from "./report-viewer";
import {
  fetchCompetitorBrandsAction,
  deleteCompetitorBrandsAction,
  generateCompetitorReportAction,
  fetchCompetitorReportsAction,
  deleteCompetitorReportAction,
} from "../actions";

// Credit cost constants (mirrored from server actions)
const REPORT_BASE_COST = 3;
const REPORT_PER_AD_COST = 2;
import type { CompetitorBrand, CompetitorReport } from "@/types/competitors";

export default function CompetitorsClient() {
  const [brands, setBrands] = useState<CompetitorBrand[]>([]);
  const [reports, setReports] = useState<CompetitorReport[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("companies");

  // ── Load data ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [brandsResult, reportsResult] = await Promise.all([
        fetchCompetitorBrandsAction(),
        fetchCompetitorReportsAction(),
      ]);
      if (brandsResult.error) throw new Error(brandsResult.error);
      if (reportsResult.error) throw new Error(reportsResult.error);
      setBrands(brandsResult.data ?? []);
      setReports(reportsResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Selection ────────────────────────────────────────────────────────

  const toggleBrand = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === brands.length) return new Set();
      return new Set(brands.map((b) => b.id));
    });
  }, [brands]);

  // ── Delete brands ────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    setError(null);
    setDeleteConfirmOpen(false);
    try {
      const result = await deleteCompetitorBrandsAction({
        brandIds: Array.from(selected),
      });
      if (!result.success) throw new Error(result.error ?? "Delete failed");
      setSelected(new Set());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [selected, loadData]);

  // ── Generate report ──────────────────────────────────────────────────

  const selectedAdCount = brands
    .filter((b) => selected.has(b.id))
    .reduce((sum, b) => sum + b.adCount, 0);

  const estimatedCost = REPORT_BASE_COST + REPORT_PER_AD_COST * selectedAdCount;

  const handleGenerate = useCallback(async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateCompetitorReportAction({
        brandIds: Array.from(selected),
      });
      if (result.error) throw new Error(result.error);
      setSelected(new Set());
      setActiveTab("reports");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }, [selected, loadData]);

  // ── Delete report ────────────────────────────────────────────────────

  const handleDeleteReport = useCallback(
    async (reportId: string) => {
      setDeletingReport(true);
      setError(null);
      try {
        const result = await deleteCompetitorReportAction({ reportId });
        if (!result.success) throw new Error(result.error ?? "Delete failed");
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingReport(false);
      }
    },
    [loadData]
  );

  // ── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage saved competitor brands and generate AI analysis reports.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="companies">
              <Users className="size-4 mr-1.5" />
              Companies
              {brands.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {brands.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileBarChart className="size-4 mr-1.5" />
              Reports
              {reports.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Actions (visible on companies tab when items selected) */}
          {activeTab === "companies" && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting || generating}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="size-4 mr-1.5" />
                )}
                Delete ({selected.size})
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating || deleting || selectedAdCount === 0}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <FileBarChart className="size-4 mr-1.5" />
                )}
                {generating
                  ? "Generating..."
                  : `Generate Report (~${estimatedCost} credits)`}
              </Button>
            </div>
          )}
        </div>

        {/* Companies tab */}
        <TabsContent value="companies">
          {brands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-semibold">No competitors saved</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Go to the Discover page, search for a competitor brand in the Meta
                Ads Library, and click &ldquo;Save Run&rdquo; to save their ads here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <CompanySelector
                brands={brands}
                selected={selected}
                onToggle={toggleBrand}
                onToggleAll={toggleAll}
              />
            </div>
          )}
        </TabsContent>

        {/* Reports tab */}
        <TabsContent value="reports">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileBarChart className="size-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-semibold">No reports yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Select one or more competitors on the Companies tab and click
                &ldquo;Generate Report&rdquo; to create an AI-powered analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportViewer
                  key={report.id}
                  report={report}
                  onDelete={handleDeleteReport}
                  deleting={deletingReport}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competitors?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selected.size} competitor
              {selected.size !== 1 ? "s" : ""} and all their saved ads. Any
              reports referencing these competitors will also be removed. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
