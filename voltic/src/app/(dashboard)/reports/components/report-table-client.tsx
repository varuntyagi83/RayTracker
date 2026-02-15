"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ColumnDef, SortDirection, DatePreset } from "@/types/reports";
import { DATE_PRESET_LABELS, getDateRangeFromPreset } from "@/types/reports";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReportTableProps<T extends Record<string, unknown>> {
  title: string;
  description: string;
  columns: ColumnDef<T>[];
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortKey: string;
  sortDirection: SortDirection;
  datePreset: DatePreset;
  onSort: (key: string, direction: SortDirection) => void;
  onPageChange: (page: number) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onPageSizeChange: (size: number) => void;
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatValue(value: unknown, format?: ColumnDef["format"]): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);

  switch (format) {
    case "currency":
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "number":
      return num.toLocaleString();
    case "percentage":
      return `${num.toFixed(2)}%`;
    case "multiplier":
      return `${num.toFixed(2)}x`;
    case "truncate": {
      const str = String(value);
      return str.length > 60 ? str.slice(0, 57) + "..." : str;
    }
    case "text":
    default:
      return String(value);
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReportTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  data,
  totalCount,
  page,
  pageSize,
  totalPages,
  sortKey,
  sortDirection,
  datePreset,
  onSort,
  onPageChange,
  onDatePresetChange,
  onPageSizeChange,
}: ReportTableProps<T>) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.filter((c) => c.visible !== false).map((c) => c.key))
  );

  const activeColumns = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.key)),
    [columns, visibleColumns]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      setVisibleColumns((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          if (next.size > 1) next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    []
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      onSort(key, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(key, "desc");
    }
  };

  const handleExportCSV = () => {
    const escapeCsvCell = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = activeColumns.map((c) => escapeCsvCell(c.label));
    const csvRows = data.map((row) =>
      activeColumns.map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return "";
        return escapeCsvCell(String(val));
      })
    );
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Range Preset */}
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_PRESET_LABELS)
              .filter(([k]) => k !== "custom")
              .map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Column Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-2 h-4 w-4" />
              Columns
              <Badge variant="secondary" className="ml-2">
                {visibleColumns.size}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Toggle columns</p>
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export CSV */}
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>

        {/* Result count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {totalCount} results
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {activeColumns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable !== false ? "cursor-pointer select-none" : ""}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeColumns.length}
                  className="text-center text-muted-foreground py-12"
                >
                  No data for this period.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  {activeColumns.map((col) => (
                    <TableCell key={col.key}>
                      {formatValue(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalCount > 0 ? `${startRow}–${endRow} of ${totalCount}` : "0 results"}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
