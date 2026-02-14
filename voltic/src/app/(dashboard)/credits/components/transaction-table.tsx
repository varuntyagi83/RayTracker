"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchCreditTransactionsAction } from "../actions";
import type { CreditTransaction, TransactionType } from "@/types/credits";
import { TRANSACTION_TYPE_LABELS } from "@/types/credits";

const PAGE_SIZES = [10, 25, 50] as const;

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "ad_insight", label: "Ad Insight" },
  { value: "comparison", label: "Comparison" },
  { value: "variation", label: "Variation" },
  { value: "creative_enhance", label: "Enhancement" },
  { value: "competitor_report", label: "Competitor Report" },
  { value: "purchase", label: "Purchase" },
  { value: "refund", label: "Refund" },
  { value: "welcome_bonus", label: "Welcome Bonus" },
];

export function TransactionTable() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await fetchCreditTransactionsAction({
      type: typeFilter,
      page,
      pageSize,
    });
    setTransactions(result.transactions);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [typeFilter, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value));
    setPage(1);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTypeBadgeVariant(
    type: TransactionType
  ): "default" | "secondary" | "destructive" | "outline" {
    if (type === "purchase" || type === "welcome_bonus" || type === "refund") {
      return "default";
    }
    return "secondary";
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No transactions found.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(tx.type)}>
                        {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          tx.amount > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
