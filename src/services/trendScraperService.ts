/**
 * Trend Intelligence Service
 * Client-side service for triggering and monitoring trend intelligence workers
 * 
 * NOTE: All heavy processing happens in Edge Functions. This service provides
 * convenient client methods to trigger and monitor those workers.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// WORKER TRIGGERS
// ============================================================================

/**
 * Trigger the trend scraper worker (TikTok via SocialKit)
 */
export async function triggerTrendScraper(): Promise<{
  success: boolean;
  totalFound?: number;
  totalStored?: number;
  error?: string;
}> {
  console.log('[TrendService] Triggering scraper worker...');
  
  try {
    const { data, error } = await supabase.functions.invoke('trend-scraper-worker', {
      method: 'POST',
    });
    
    if (error) throw error;
    
    console.log('[TrendService] Scraper result:', data);
    return {
      success: data.success,
      totalFound: data.totalFound,
      totalStored: data.totalStored,
      error: data.error,
    };
  } catch (error: any) {
    console.error('[TrendService] Scraper failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger the trend analysis worker
 */
export async function triggerTrendAnalysis(): Promise<{
  success: boolean;
  processed?: number;
  errors?: number;
  error?: string;
}> {
  console.log('[TrendService] Triggering analysis worker...');
  
  try {
    const { data, error } = await supabase.functions.invoke('trend-analysis-worker', {
      method: 'POST',
    });
    
    if (error) throw error;
    
    console.log('[TrendService] Analysis result:', data);
    return {
      success: data.success,
      processed: data.processed,
      errors: data.errors,
      error: data.error,
    };
  } catch (error: any) {
    console.error('[TrendService] Analysis failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run full trend discovery pipeline (scrape + analyze)
 */
export async function runFullTrendDiscovery(): Promise<{
  success: boolean;
  scraped?: number;
  analyzed?: number;
  error?: string;
}> {
  console.log('[TrendService] Running full trend discovery...');
  
  // Step 1: Scrape new trends
  const scrapeResult = await triggerTrendScraper();
  
  if (!scrapeResult.success) {
    return { success: false, error: `Scraping failed: ${scrapeResult.error}` };
  }
  
  // Step 2: Analyze raw trends
  const analysisResult = await triggerTrendAnalysis();
  
  return {
    success: analysisResult.success,
    scraped: scrapeResult.totalStored,
    analyzed: analysisResult.processed,
    error: analysisResult.error,
  };
}

// ============================================================================
// NICHE KEYWORDS (for client-side filtering)
// ============================================================================

export const NICHE_KEYWORDS: Record<string, string[]> = {
  'fitness': ['workout', 'gym', 'fitness', 'exercise', 'muscle', 'gains', 'lift', 'training'],
  'beauty': ['makeup', 'beauty', 'skincare', 'glow', 'foundation', 'mascara', 'contour'],
  'fashion': ['outfit', 'ootd', 'fashion', 'style', 'clothing', 'dress', 'streetwear'],
  'food': ['recipe', 'cooking', 'food', 'meal', 'kitchen', 'baking', 'yummy'],
  'comedy': ['funny', 'comedy', 'joke', 'humor', 'laugh', 'hilarious', 'skit'],
  'dance': ['dance', 'choreo', 'choreography', 'dancing', 'moves', 'routine'],
  'music': ['song', 'music', 'singing', 'cover', 'artist', 'beat'],
  'gaming': ['game', 'gaming', 'gamer', 'play', 'stream', 'esports'],
  'lifestyle': ['lifestyle', 'routine', 'vlog', 'life', 'morning', 'night'],
  'education': ['learn', 'tip', 'hack', 'tutorial', 'guide', 'explain'],
  'pets': ['dog', 'cat', 'pet', 'puppy', 'kitten', 'animal'],
  'travel': ['travel', 'trip', 'vacation', 'adventure', 'explore'],
  'motivation': ['motivation', 'inspire', 'success', 'mindset', 'growth'],
  'relationship': ['couple', 'relationship', 'love', 'boyfriend', 'girlfriend'],
};

/**
 * Detect niches from trend content
 */
export function detectNiches(title: string, hashtags: string[] = []): string[] {
  const combined = `${title} ${hashtags.join(' ')}`.toLowerCase();
  const detected: string[] = [];
  
  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        if (!detected.includes(niche)) {
          detected.push(niche);
        }
        break;
      }
    }
  }
  
  return detected;
}

/**
 * Filter trends by niche
 */
export function filterTrendsByNiche(
  trends: Array<{ title: string; hashtags?: string[] }>,
  niche: string
): typeof trends {
  const keywords = NICHE_KEYWORDS[niche] || [];
  if (keywords.length === 0) return trends;
  
  return trends.filter(trend => {
    const combined = `${trend.title} ${(trend.hashtags || []).join(' ')}`.toLowerCase();
    return keywords.some(keyword => combined.includes(keyword));
  });
}
