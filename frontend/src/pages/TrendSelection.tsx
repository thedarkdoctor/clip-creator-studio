import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { TrendCard } from '@/components/TrendCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTrends, useSaveUserTrends, usePlatforms, useDiscoverTrends } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function TrendSelection() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useTrends();
  const { data: platforms } = usePlatforms();
  const saveUserTrends = useSaveUserTrends();
  const discoverTrends = useDiscoverTrends();
  
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasAttemptedDiscovery, setHasAttemptedDiscovery] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleDiscoverTrends = async () => {
    setIsDiscovering(true);
    try {
      await discoverTrends.mutateAsync();
      await refetchTrends();
      setHasAttemptedDiscovery(true);
      toast({
        title: 'Trends discovered',
        description: 'Found trending content for your niche',
      });
    } catch (error: any) {
      setHasAttemptedDiscovery(true);
      toast({
        title: 'Discovery failed',
        description: error.message || 'Failed to discover trends. Using cached trends.',
        variant: 'destructive',
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  // Discover trends on mount if we have user profile (only once)
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      !trendsLoading &&
      !hasAttemptedDiscovery &&
      (!trends || trends.length === 0)
    ) {
      handleDiscoverTrends();
    }
  }, [user, authLoading, trendsLoading, trends, hasAttemptedDiscovery]);

  const toggleTrend = (id: string) => {
    setSelectedTrends((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Map platform name to filter format
  const getPlatformFilterName = (name: string) => {
    if (name.includes('TikTok')) return 'tiktok';
    if (name.includes('Instagram')) return 'instagram';
    if (name.includes('YouTube')) return 'youtube';
    return name.toLowerCase();
  };

  const filteredTrends = filter === 'all'
    ? trends
    : trends?.filter((t) => {
        const platformName = (t.platforms as any)?.name || '';
        return getPlatformFilterName(platformName) === filter;
      });

  const handleNext = async () => {
    if (selectedTrends.length === 0) return;
    
    setIsSaving(true);
    try {
      await saveUserTrends.mutateAsync(selectedTrends);
      navigate('/upload');
    } catch (error) {
      toast({
        title: 'Error saving',
        description: 'Failed to save your trend selections. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || trendsLoading) {
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
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <ProgressSteps steps={steps} currentStep={1} />

        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Select Trending Formats</h1>
              <p className="text-muted-foreground">
                Choose the formats that match your content style. Select multiple for variety.
              </p>
            </div>

            {/* Discover Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscoverTrends}
              disabled={isDiscovering}
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Discovering...
                </>
              ) : (
                'Discover New Trends'
              )}
            </Button>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-field py-2 w-40"
              >
                <option value="all">All Platforms</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>

          {/* Selected count */}
          {selectedTrends.length > 0 && (
            <div className="mb-6 text-sm text-primary">
              {selectedTrends.length} trend{selectedTrends.length > 1 ? 's' : ''} selected
            </div>
          )}

          {/* Trend Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {filteredTrends?.map((trend, index) => {
              const platformName = (trend.platforms as any)?.name || '';
              const platform = getPlatformFilterName(platformName) as 'tiktok' | 'instagram' | 'youtube';
              
              return (
                <div
                  key={trend.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TrendCard
                    trend={{
                      id: trend.id,
                      platform,
                      title: trend.title,
                      description: trend.description || '',
                      engagement: trend.engagement || '',
                      thumbnail: (trend as any).media_url || '/placeholder.svg',
                      embedUrl: (trend as any).embed_url,
                      mediaType: (trend as any).media_type || 'video',
                    }}
                    selected={selectedTrends.includes(trend.id)}
                    onToggle={() => toggleTrend(trend.id)}
                  />
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex justify-between items-center glass-card rounded-xl p-4">
            <span className="text-muted-foreground">
              {selectedTrends.length === 0 
                ? 'Select at least one trend to continue'
                : `Ready with ${selectedTrends.length} format${selectedTrends.length > 1 ? 's' : ''}`
              }
            </span>
            <Button
              variant="gradient"
              size="lg"
              disabled={selectedTrends.length === 0 || isSaving}
              onClick={handleNext}
              className="group"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Next
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
