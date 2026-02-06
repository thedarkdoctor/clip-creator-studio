import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrendEmptyStateProps {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function TrendEmptyState({
  title = 'No trends found',
  description = 'We haven\'t discovered any trends matching your criteria yet. Try adjusting your filters or check back later.',
  onRefresh,
  isLoading = false,
}: TrendEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <TrendingUp className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {onRefresh && (
        <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}
