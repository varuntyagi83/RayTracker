"use client";

import {
  DollarSign,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KPIType = "revenue" | "spend" | "profit";

interface KPICardProps {
  type: KPIType;
  today: number;
  yesterday: number;
  last7Days: number;
  currency?: string;
  marginPercent?: number;
}

const icons: Record<KPIType, React.ElementType> = {
  revenue: DollarSign,
  spend: Wallet,
  profit: TrendingUp,
};

const labels: Record<KPIType, string> = {
  revenue: "Revenue",
  spend: "Spend",
  profit: "Profit",
};

const iconColors: Record<KPIType, string> = {
  revenue: "bg-emerald-100 text-emerald-600",
  spend: "bg-blue-100 text-blue-600",
  profit: "bg-purple-100 text-purple-600",
};

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function KPICard({
  type,
  today,
  yesterday,
  last7Days,
  currency = "USD",
  marginPercent,
}: KPICardProps) {
  const Icon = icons[type];
  const change = percentChange(today, yesterday);
  const isPositive = type === "spend" ? change <= 0 : change >= 0;

  const chartData = [
    { name: "Yesterday", value: yesterday },
    { name: "Today", value: today },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                iconColors[type]
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {labels[type]}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center text-xs font-medium",
                    isPositive ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="mr-0.5 size-3" />
                  ) : (
                    <ArrowDownRight className="mr-0.5 size-3" />
                  )}
                  {Math.abs(change).toFixed(1)}%
                </span>
                {type === "profit" && marginPercent !== undefined && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                    {marginPercent.toFixed(0)}% margin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mini bar chart */}
          <div className="h-12 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Bar
                  dataKey="value"
                  fill={isPositive ? "#059669" : "#ef4444"}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Primary value */}
        <div className="mt-4">
          <p className="text-2xl font-bold">{formatCurrency(today, currency)}</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>

        {/* Bottom comparisons */}
        <div className="mt-4 flex items-center gap-4 border-t pt-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              YESTERDAY
            </p>
            <p className="text-sm font-semibold">
              {formatCurrency(yesterday, currency)}
            </p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              LAST 7 DAYS
            </p>
            <p className="text-sm font-semibold">
              {formatCurrency(last7Days, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
