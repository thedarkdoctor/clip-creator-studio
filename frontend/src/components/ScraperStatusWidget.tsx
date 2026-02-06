/**
 * Scraper Status Widget
 * Shows health of trend scrapers with manual trigger capability
 */

import { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useScraperStatus } from '@/hooks/useTrendIntelligence';
import { useUserProfile, useUserPlatforms, usePlatforms } from '@/hooks/useSupabaseData';
import { triggerTrendScraper, runFullTrendDiscovery } from '@/services/trendScraperService';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function ScraperStatusWidget() {
  const { data: scrapers, isLoading, error } = useScraperStatus();
  const { data: userProfile } = useUserProfile();
  const { data: userPlatforms } = useUserPlatforms();
  const { data: allPlatforms } = usePlatforms();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRunning, setIsRunning] = useState(false);

  // Map user's selected platform IDs to platform names
  const getSelectedPlatformNames = (): string[] => {
    if (!userPlatforms || !allPlatforms) return [];
    return userPlatforms
      .map(up => allPlatforms.find(p => p.id === up.platform_id)?.name?.toLowerCase())
      .filter((name): name is string => !!name);
  };

  const handleRunScraper = async () => {
    setIsRunning(true);
    
    const platforms = getSelectedPlatformNames();
    const niche = userProfile?.niche || '';
    
    toast({
      title: 'Starting trend discovery',
      description: `Scraping ${platforms.length > 0 ? platforms.join(', ') : 'all platforms'}${niche ? ` for ${niche}` : ''}...`,
    });
    
    try {
      const result = await runFullTrendDiscovery({ platforms, niche });
      
      if (result.success) {
        toast({
          title: 'Trends discovered!',
          description: `Found ${result.scraped || 0} new trends, analyzed ${result.analyzed || 0}`,
        });
        
        // Refresh trends and scraper status
        queryClient.invalidateQueries({ queryKey: ['trends-v2'] });
        queryClient.invalidateQueries({ queryKey: ['scraper-status'] });
      } else {
        toast({
          title: 'Scraping issues',
          description: result.error || result.errors?.join(', ') || 'Some platforms may have failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Scraper error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

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

  if (error) {
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

  const platformNames = getSelectedPlatformNames();

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Scraper Status
        </h3>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleRunScraper}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Discover Trends
            </>
          )}
        </Button>
      </div>

      {platformNames.length > 0 && (
        <div className="mb-3 text-xs text-muted-foreground">
          Scraping: {platformNames.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
          {userProfile?.niche && ` • ${userProfile.niche}`}
        </div>
      )}

      <div className="space-y-3">
        {scrapers && scrapers.map((scraper) => (
          <div
            key={scraper.id}
            className="flex items-center justify-between p-2 rounded bg-secondary/30"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(scraper)}
              <span className="text-sm font-medium capitalize">
                {scraper.scraper_name.replace(/_/g, ' ').replace('rapidapi ', '')}
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

      {(!scrapers || scrapers.length === 0) && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No scrapers have run yet. Click "Discover Trends" to start.
        </div>
      )}
    </div>
  );
}
