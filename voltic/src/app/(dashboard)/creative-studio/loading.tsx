import { Skeleton } from "@/components/ui/skeleton";

export default function CreativeStudioLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-20 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
