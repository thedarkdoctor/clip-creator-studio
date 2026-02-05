/**
 * Trend Intelligence Dashboard
 * Production interface for trend analysis (NOT video player)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { TrendIntelligenceCard } from '@/components/TrendIntelligenceCard';
import { TrendFiltersBar } from '@/components/TrendFiltersBar';
import { ScraperStatusWidget } from '@/components/ScraperStatusWidget';
import { ContentGenerationButton } from '@/components/ContentGenerationButton';
import { AutoModeToggle } from '@/components/AutoModeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTrends, type TrendFilters } from '@/hooks/useTrendIntelligence';
import { useSaveUserTrends } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import type { EnhancedTrend } from '@/types/trendIntelligence';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function TrendSelectionV2() {
  const navigate = useNavigate();
  const { user, loading: authLoading, userId, businessName, niche, isLynkscopeSession, lynkscopeUser } = useAuth();
  const { toast } = useToast();
  const saveUserTrends = useSaveUserTrends();
  
  const [filters, setFilters] = useState<TrendFilters>({});
  const [selectedTrends, setSelectedTrends] = useState<Set<string>>(new Set());
  const [showAutoMode, setShowAutoMode] = useState(false);
  
  // Use user's niche for strategy-aware trend scoring
  const effectiveNiche = niche || lynkscopeUser?.niche;
  const { data: trends, isLoading: trendsLoading, error } = useTrends(filters, effectiveNiche);
  
  // Check if user profile is complete for content generation
  const isProfileComplete = useMemo(() => {
    return !!(userId && businessName && effectiveNiche);
  }, [userId, businessName, effectiveNiche]);

  useEffect(() => {
    if (!authLoading && !user && !lynkscopeUser) {
      navigate('/auth');
    }
  }, [user, lynkscopeUser, authLoading, navigate]);

  const toggleTrend = (trend: EnhancedTrend) => {
    setSelectedTrends((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trend.id)) {
        newSet.delete(trend.id);
      } else {
        newSet.add(trend.id);
      }
      return newSet;
    });
  };

  const handleNext = async () => {
    if (selectedTrends.size === 0) {
      toast({
        title: 'No trends selected',
        description: 'Please select at least one trend to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save selected trends to database
      const selectedTrendIds = Array.from(selectedTrends);
      await saveUserTrends.mutateAsync(selectedTrendIds);
      
      // Also store in session storage for reference
      sessionStorage.setItem('selectedTrends', JSON.stringify(selectedTrendIds));
      
      navigate('/upload');
    } catch (error: any) {
      toast({
        title: 'Error saving trends',
        description: error.message || 'Failed to save your selected trends',
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/brand-setup')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
        <ProgressSteps steps={steps} currentStep={1} />

        <div className="animate-fade-in">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="text-primary" />
                Trend Intelligence
              </h1>
              <p className="text-muted-foreground">
                Analyze viral patterns, hooks, and content structures. 
                {selectedTrends.size > 0 && (
                  <span className="text-primary ml-2">
                    {selectedTrends.size} trend{selectedTrends.size !== 1 ? 's' : ''} selected
                  </span>
                )}
              </p>
            </div>
            
            {/* Content Generation Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isProfileComplete && (
                <div className="w-full sm:w-auto">
                  <ContentGenerationButton
                    maxTrends={5}
                    variant="default"
                    size="default"
                    showProgress={false}
                  />
                </div>
              )}
            </div>
          </div>

          {!isProfileComplete && (isLynkscopeSession || user) && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Complete Your Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Set your business name and niche in Lynkscope to enable AI-powered content generation.
                    {!businessName && ' Missing: Business Name.'}
                    {!effectiveNiche && ' Missing: Niche.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auto Mode Toggle */}
          {isProfileComplete && (
            <div className="mb-6">
              <AutoModeToggle onToggle={setShowAutoMode} />
            </div>
          )}

          {/* Scraper Status */}
          <div className="mb-6">
            <ScraperStatusWidget />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <TrendFiltersBar filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Loading State */}
          {trendsLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analyzing trends...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="glass-card rounded-xl p-8 text-center border-destructive/50">
              <p className="text-destructive mb-4">Failed to load trends</p>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {/* Trends Grid */}
          {!trendsLoading && !error && trends && (
            <>
              {trends.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No trends found</h3>
                  <p className="text-muted-foreground mb-6">
                    {filters.platform || filters.format_type || filters.searchQuery
                      ? 'Try adjusting your filters or run the scrapers to fetch new trends.'
                      : 'Run the trend scrapers to start discovering viral patterns.'}
                  </p>
                  <Button variant="outline" onClick={() => setFilters({})}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  {trends.map((trend, index) => (
                    <div
                      key={trend.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <TrendIntelligenceCard
                        trend={trend}
                        onSelect={toggleTrend}
                        isSelected={selectedTrends.has(trend.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Next Button */}
          {!trendsLoading && trends && trends.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="gradient"
                size="lg"
                onClick={handleNext}
                disabled={selectedTrends.size === 0}
              >
                Continue
                <ArrowRight />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
