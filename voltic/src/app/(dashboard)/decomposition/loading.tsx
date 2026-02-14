import { Skeleton } from "@/components/ui/skeleton";

export default function DecompositionLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <Skeleton className="h-64 w-full max-w-2xl rounded-lg" />
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[240px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
