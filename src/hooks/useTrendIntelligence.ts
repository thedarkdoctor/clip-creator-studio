/**
 * Trend Intelligence Hooks
 * Production-ready React hooks for trend data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrendV2, EnhancedTrend } from '@/types/trendIntelligence';

// ============================================================================
// TREND QUERIES
// ============================================================================

export interface TrendFilters {
  platform?: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook';
  format_type?: 'pov' | 'transformation' | 'tutorial' | 'meme' | 'storytime' | 'relatable' | 'aesthetic' | 'challenge' | 'other';
  minScore?: number;
  searchQuery?: string;
}

/**
 * Fetch trends with optional filters
 */
export function useTrends(filters?: TrendFilters) {
  return useQuery({
    queryKey: ['trends-v2', filters],
    queryFn: async () => {
      console.log('[useTrends] Fetching trends with filters:', filters);
      
      let query = supabase
        .from('trends_v2')
        .select(`
          *,
          trend_metrics (
            views,
            likes,
            shares,
            comments,
            engagement_rate,
            collected_at
          ),
          trend_patterns (
            intro_type,
            pacing_pattern,
            editing_style,
            caption_structure
          ),
          trend_hashtags (
            hashtag
          )
        `)
        .eq('is_active', true)
        .order('trend_score', { ascending: false })
        .limit(50);

      // Apply filters
      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters?.format_type) {
        query = query.eq('format_type', filters.format_type);
      }
      
      if (filters?.minScore !== undefined) {
        query = query.gte('trend_score', filters.minScore);
      }
      
      if (filters?.searchQuery) {
        query = query.ilike('title', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useTrends] Query failed:', error);
        throw error;
      }

      console.log(`[useTrends] Fetched ${data?.length || 0} trends`);
      
      // Transform to EnhancedTrend format
      const enhanced: EnhancedTrend[] = (data || []).map((trend: any) => ({
        ...trend,
        metrics: trend.trend_metrics?.[0],
        pattern: trend.trend_patterns?.[0],
        hashtags: trend.trend_hashtags || [],
      }));

      return enhanced;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch a single trend with full details
 */
export function useTrendDetail(trendId: string | undefined) {
  return useQuery({
    queryKey: ['trend-detail', trendId],
    queryFn: async () => {
      if (!trendId) return null;
      
      console.log('[useTrendDetail] Fetching trend:', trendId);

      const { data, error } = await supabase
        .from('trends_v2')
        .select(`
          *,
          trend_metrics (
            views,
            likes,
            shares,
            comments,
            engagement_rate,
            collected_at
          ),
          trend_patterns (
            intro_type,
            pacing_pattern,
            editing_style,
            caption_structure,
            text_overlay_frequency,
            transition_style
          ),
          trend_hashtags (
            hashtag,
            frequency_score
          )
        `)
        .eq('id', trendId)
        .single();

      if (error) {
        console.error('[useTrendDetail] Query failed:', error);
        throw error;
      }

      // Transform to EnhancedTrend
      const enhanced: EnhancedTrend = {
        ...data,
        metrics: data.trend_metrics?.[0],
        pattern: data.trend_patterns?.[0],
        hashtags: data.trend_hashtags || [],
      };

      return enhanced;
    },
    enabled: !!trendId,
  });
}

/**
 * Get platform statistics
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      console.log('[usePlatformStats] Fetching platform statistics');

      const { data, error } = await supabase
        .from('trends_v2')
        .select('platform, trend_score')
        .eq('is_active', true);

      if (error) throw error;

      // Aggregate stats by platform
      const stats = data.reduce((acc: any, trend) => {
        if (!acc[trend.platform]) {
          acc[trend.platform] = {
            count: 0,
            avgScore: 0,
            totalScore: 0,
          };
        }
        acc[trend.platform].count++;
        acc[trend.platform].totalScore += trend.trend_score;
        return acc;
      }, {});

      // Calculate averages
      Object.keys(stats).forEach(platform => {
        stats[platform].avgScore = Math.round(
          stats[platform].totalScore / stats[platform].count
        );
      });

      return stats;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// SCRAPER STATUS
// ============================================================================

/**
 * Monitor scraper health and activity
 */
export function useScraperStatus() {
  return useQuery({
    queryKey: ['scraper-status'],
    queryFn: async () => {
      console.log('[useScraperStatus] Fetching scraper status');

      const { data, error } = await supabase
        .from('scraper_status')
        .select('*')
        .order('last_run_at', { ascending: false });

      if (error) {
        console.error('[useScraperStatus] Query failed:', error);
        throw error;
      }

      return data;
    },
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// ============================================================================
// TREND ACTIONS
// ============================================================================

/**
 * Mark trend as favorite (for future use)
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trendId: string) => {
      // TODO: Implement favorites table
      console.log('[useToggleFavorite] Toggle favorite:', trendId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends-v2'] });
    },
  });
}

/**
 * Report trend issue (for future moderation)
 */
export function useReportTrend() {
  return useMutation({
    mutationFn: async ({ trendId, reason }: { trendId: string; reason: string }) => {
      console.log('[useReportTrend] Reporting trend:', trendId, reason);
      // TODO: Implement reporting system
    },
  });
}
