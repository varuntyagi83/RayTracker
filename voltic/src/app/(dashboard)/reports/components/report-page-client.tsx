"use client";

import { useState, useEffect, useCallback } from "react";
import ReportTable from "./report-table-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef, SortDirection, DatePreset, ReportResult, DateRange } from "@/types/reports";
import { getDateRangeFromPreset } from "@/types/reports";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReportPageClientProps<T extends Record<string, unknown>> {
  title: string;
  description: string;
  columns: ColumnDef<T>[];
  defaultSortKey: string;
  defaultSortDirection?: SortDirection;
  fetchAction: (input: {
    dateRange: DateRange;
    sort: { key: string; direction: SortDirection };
    page: number;
    pageSize: number;
  }) => Promise<ReportResult<T> | { error: string }>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReportPageClient<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  defaultSortKey,
  defaultSortDirection = "desc",
  fetchAction,
}: ReportPageClientProps<T>) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7d");
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const dateRange = getDateRangeFromPreset(datePreset);
    const result = await fetchAction({
      dateRange,
      sort: { key: sortKey, direction: sortDirection },
      page,
      pageSize,
    });

    if ("error" in result) {
      setData([]);
      setTotalCount(0);
      setTotalPages(0);
    } else {
      setData(result.rows);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    }
    setLoading(false);
  }, [datePreset, sortKey, sortDirection, page, pageSize, fetchAction]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1);
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <ReportTable<T>
        title={title}
        description={description}
        columns={columns}
        data={data}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        sortKey={sortKey}
        sortDirection={sortDirection}
        datePreset={datePreset}
        onSort={handleSort}
        onPageChange={setPage}
        onDatePresetChange={handleDatePresetChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
