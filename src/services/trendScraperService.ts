/**
 * Trend Intelligence Service
 * Client-side service for triggering and monitoring trend intelligence workers
 * 
 * Supports: TikTok, Instagram, YouTube via RapidAPI
 */

import { supabase } from '@/integrations/supabase/client';
import { generateNicheKeywords } from '../lib/generateNicheKeywords';

// ============================================================================
// WORKER TRIGGERS
// ============================================================================

interface ScraperOptions {
  platforms?: string[];
  niche?: string;
}

/**
 * Trigger the trend scraper worker with optional platform/niche filters
 */
export async function triggerTrendScraper(options?: ScraperOptions): Promise<{
  success: boolean;
  totalFound?: number;
  totalStored?: number;
  results?: { platform: string; hashtag: string; found: number; stored: number }[];
  errors?: string[];
  error?: string;
}> {
  console.log('[TrendService] Triggering scraper worker...', options);
  
  try {
    const { data, error } = await supabase.functions.invoke('trend-scraper-worker', {
      method: 'POST',
      body: {
        platforms: options?.platforms || [],
        niche: options?.niche || '',
      },
    });
    
    if (error) throw error;
    
    console.log('[TrendService] Scraper result:', data);
    return {
      success: data.success,
      totalFound: data.totalFound,
      totalStored: data.totalStored,
      results: data.results,
      errors: data.errors,
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
export async function runFullTrendDiscovery(options?: ScraperOptions): Promise<{
  success: boolean;
  scraped?: number;
  analyzed?: number;
  results?: { platform: string; hashtag: string; found: number; stored: number }[];
  errors?: string[];
  error?: string;
}> {
  console.log('[TrendService] Running full trend discovery...', options);
  
  // Step 1: Scrape new trends
  const scrapeResult = await triggerTrendScraper(options);
  
  if (!scrapeResult.success && !scrapeResult.totalFound) {
    return { 
      success: false, 
      error: `Scraping failed: ${scrapeResult.error}`,
      errors: scrapeResult.errors,
    };
  }
  
  // Step 2: Analyze raw trends
  const analysisResult = await triggerTrendAnalysis();
  
  return {
    success: analysisResult.success || (scrapeResult.totalStored ?? 0) > 0,
    scraped: scrapeResult.totalStored,
    analyzed: analysisResult.processed,
    results: scrapeResult.results,
    errors: scrapeResult.errors,
    error: analysisResult.error,
  };
}

// ============================================================================

// Helper to score trend relevance to a niche
export function getNicheRelevanceScore(trend: { title: string; hashtags?: string[] }, niche: string): number {
  const keywords = generateNicheKeywords(niche);
  const combined = `${trend.title} ${(trend.hashtags || []).join(' ')}`.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (combined.includes(kw.toLowerCase())) matches++;
  }
  return Math.min(1, matches / Math.max(1, keywords.length));
}

// Brand-safe filter: allow only educational, inspirational, demonstration, niche-aligned
export function isBrandSafe(trend: { title: string; description?: string; hashtags?: string[] }): boolean {
  const text = `${trend.title} ${trend.description || ''} ${(trend.hashtags || []).join(' ')}`.toLowerCase();
  const banned = ['meme', 'celebrity', 'drama', 'gossip', 'scandal', 'prank', 'fail'];
  if (banned.some(b => text.includes(b))) return false;
  const allowed = ['educational', 'inspirational', 'demonstration', 'how to', 'tutorial', 'case study', 'success', 'story', 'lesson'];
  return allowed.some(a => text.includes(a)) || true; // fallback: allow if not banned
}

/**
 * Detect niches from trend content
 */
export function detectNiches(title: string, hashtags: string[] = []): string[] {
  const allNiches = ['fitness', 'real estate', 'marketing', 'beauty', 'fashion', 'food', 'comedy', 'dance', 'music', 'gaming', 'lifestyle', 'education', 'pets', 'travel', 'motivation', 'relationship'];
  const combined = `${title} ${hashtags.join(' ')}`.toLowerCase();
  return allNiches.filter(niche => generateNicheKeywords(niche).some(kw => combined.includes(kw.toLowerCase())));
}

/**
 * Filter trends by niche
 */
export function filterTrendsByNiche(
  trends: Array<{ title: string; hashtags?: string[] }>,
  niche: string
): typeof trends {
  const keywords = generateNicheKeywords(niche);
  if (keywords.length === 0) return trends;
  return trends.filter(trend => {
    const combined = `${trend.title} ${(trend.hashtags || []).join(' ')}`.toLowerCase();
    return keywords.some(keyword => combined.includes(keyword.toLowerCase()));
  });
}
