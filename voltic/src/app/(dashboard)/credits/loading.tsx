import { Skeleton } from "@/components/ui/skeleton";

export default function CreditsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="mb-8">
        <Skeleton className="h-40 w-full max-w-md rounded-lg" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
