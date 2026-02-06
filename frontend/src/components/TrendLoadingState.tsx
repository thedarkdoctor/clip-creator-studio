import { Skeleton } from '@/components/ui/skeleton';

interface TrendLoadingStateProps {
  count?: number;
}

export function TrendLoadingState({ count = 6 }: TrendLoadingStateProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
