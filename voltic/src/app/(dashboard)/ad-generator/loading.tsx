import { Skeleton } from "@/components/ui/skeleton";

export default function AdGeneratorLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg lg:col-span-2" />
      </div>
    </div>
  );
}
