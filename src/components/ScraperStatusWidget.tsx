/**
 * Scraper Status Widget
 * Shows health of trend scrapers
 */

import { Activity, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useScraperStatus } from '@/hooks/useTrendIntelligence';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function ScraperStatusWidget() {
  const { data: scrapers, isLoading, error } = useScraperStatus();

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-primary" />
          <span className="font-semibold">Scraper Status</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error || !scrapers) {
    return (
      <div className="glass-card rounded-lg p-4 border-destructive/50">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} />
          Failed to load scraper status
        </div>
      </div>
    );
  }

  const getStatusIcon = (scraper: any) => {
    if (!scraper.is_enabled) {
      return <XCircle size={16} className="text-muted-foreground" />;
    }
    
    const successRate = scraper.total_runs > 0
      ? (scraper.total_successes / scraper.total_runs) * 100
      : 0;

    if (successRate >= 80) {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (successRate >= 50) {
      return <AlertCircle size={16} className="text-yellow-500" />;
    } else {
      return <XCircle size={16} className="text-destructive" />;
    }
  };

  const getStatusColor = (scraper: any) => {
    if (!scraper.is_enabled) return 'text-muted-foreground';
    
    const successRate = scraper.total_runs > 0
      ? (scraper.total_successes / scraper.total_runs) * 100
      : 0;

    if (successRate >= 80) return 'text-green-500';
    if (successRate >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Scraper Status
        </h3>
      </div>

      <div className="space-y-3">
        {scrapers.map((scraper) => (
          <div
            key={scraper.id}
            className="flex items-center justify-between p-2 rounded bg-secondary/30"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(scraper)}
              <span className="text-sm font-medium capitalize">
                {scraper.scraper_name.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {scraper.last_run_at && (
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(scraper.last_run_at), { addSuffix: true })}
                </div>
              )}
              
              <div className={getStatusColor(scraper)}>
                {scraper.total_runs > 0 && (
                  <>
                    {scraper.total_successes}/{scraper.total_runs}
                    <span className="ml-1">
                      ({Math.round((scraper.total_successes / scraper.total_runs) * 100)}%)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {scrapers.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No scrapers configured yet
        </div>
      )}
    </div>
  );
}
