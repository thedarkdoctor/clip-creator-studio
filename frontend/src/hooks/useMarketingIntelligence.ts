// src/hooks/useMarketingIntelligence.ts
/**
 * Hook for fetching and using marketing intelligence data
 * Automatically applies strategy-aware adjustments to trends and content
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MarketingIntelligence } from '@/services/marketingStrategyService';

/**
 * Fetch marketing intelligence for the current user
 */
export function useMarketingIntelligence() {
  const { user, userId } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: ['marketing-intelligence', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      console.log('[useMarketingIntelligence] Fetching for user:', effectiveUserId);

      const { data, error } = await (supabase as any)
        .from('marketing_intelligence')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[useMarketingIntelligence] No intelligence found');
          return null;
        }
        console.error('[useMarketingIntelligence] Error:', error);
        return null;
      }

      console.log('[useMarketingIntelligence] Loaded intelligence:', {
        topPlatform: data.top_platform,
        underperforming: data.underperforming_platforms,
        niche: data.niche,
      });

      return data as MarketingIntelligence;
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get strategy summary from marketing intelligence
 */
export function useStrategyInsights() {
  const { data: intelligence, isLoading, error } = useMarketingIntelligence();

  if (!intelligence) {
    return {
      isLoading,
      error,
      hasIntelligence: false,
      priorityPlatforms: [] as string[],
      topPlatform: null as string | null,
      niche: null as string | null,
      businessName: null as string | null,
      totalClicks: 0,
      platformBreakdown: null,
    };
  }

  return {
    isLoading,
    error,
    hasIntelligence: true,
    priorityPlatforms: intelligence.underperforming_platforms || [],
    topPlatform: intelligence.top_platform,
    niche: intelligence.niche,
    businessName: intelligence.business_name,
    totalClicks: intelligence.total_clicks,
    platformBreakdown: intelligence.platform_click_breakdown,
  };
}
