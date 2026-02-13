import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <div className="space-y-8 p-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                <Skeleton className="h-12 w-20" />
              </div>
              <div className="mt-4 space-y-1">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="mt-4 flex gap-4 border-t pt-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top assets skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-96" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="w-[220px] shrink-0">
              <CardContent className="p-0">
                <Skeleton className="h-32 w-full rounded-t-lg" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
