"/**
 * Trend Intelligence Scraper
 * 
 * Scrapes trend aggregator sites (NOT direct social media platforms)
 * to collect viral trend data, engagement metrics, and pattern information.
 * 
 * Sources:
 * - TrendTok (tiktok trends)
 * - Social Blade
 * - Trend tracking websites
 * - Public trend APIs
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface ScrapedTrend {
  title: string;
  description?: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook';
  source_url: string;
  hashtags?: string[];
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  audio_name?: string;
  duration?: number;
  format_hints?: string[];
}

interface ScraperResult {
  success: boolean;
  trends: ScrapedTrend[];
  error?: string;
  source: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const REQUEST_DELAY_MS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  console.log(`[Scraper] Fetching: ${url}`);
  
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        console.warn(`[Scraper] Rate limited, waiting...`);
        await delay(REQUEST_DELAY_MS * 2);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      console.error(`[Scraper] Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await delay(REQUEST_DELAY_MS);
    }
  }
  
  throw new Error('Max retries exceeded');
}

// ============================================================================
// TREND AGGREGATOR SCRAPERS
// ============================================================================

/**
 * Scrape TikTok Creative Center (public trends page)
 */
async function scrapeTikTokCreativeCenter(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping TikTok Creative Center...');
  
  try {
    // TikTok Creative Center has public APIs we can use
    const url = 'https://ads.tiktok.com/creative_radar_api/v1/popular_trend/list';
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        limit: 20,
        period: 7, // Last 7 days
        country_code: 'US',
      }),
    });

    const data = await response.json();
    const trends: ScrapedTrend[] = [];

    if (data.data?.list) {
      for (const item of data.data.list) {
        trends.push({
          title: item.trend_name || item.hashtag_name,
          description: item.trend_desc,
          platform: 'tiktok',
          source_url: item.trend_link || `https://www.tiktok.com/tag/${item.hashtag_name}`,
          hashtags: item.hashtag_name ? [`#${item.hashtag_name}`] : [],
          views: item.view_count,
          audio_name: item.music_title,
        });
      }
    }

    console.log(`[Scraper] TikTok: Found ${trends.length} trends`);
    return { success: true, trends, source: 'tiktok_creative_center' };
    
  } catch (error: any) {
    console.error('[Scraper] TikTok scraping failed:', error);
    return { success: false, trends: [], error: error.message, source: 'tiktok_creative_center' };
  }
}

/**
 * Scrape Instagram trending topics via RapidAPI
 */
async function scrapeInstagramTrends(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping Instagram trends...');
  
  const RAPID_API_KEY = import.meta.env.VITE_RAPID_API_KEY;
  
  if (!RAPID_API_KEY) {
    console.warn('[Scraper] RapidAPI key not found');
    return { success: false, trends: [], error: 'API key missing', source: 'instagram_rapid' };
  }

  try {
    const response = await fetchWithRetry(
      'https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag_posts',
      {
        headers: {
          'X-RapidAPI-Key': RAPID_API_KEY,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
        },
      }
    );

    const data = await response.json();
    const trends: ScrapedTrend[] = [];

    // Process Instagram data
    if (data.items) {
      for (const item of data.items.slice(0, 10)) {
        trends.push({
          title: item.caption?.slice(0, 100) || 'Instagram Reel',
          description: item.caption,
          platform: 'instagram',
          source_url: `https://www.instagram.com/reel/${item.code}`,
          hashtags: extractHashtags(item.caption || ''),
          likes: item.like_count,
          comments: item.comment_count,
          views: item.view_count,
        });
      }
    }

    console.log(`[Scraper] Instagram: Found ${trends.length} trends`);
    return { success: true, trends, source: 'instagram_rapid' };
    
  } catch (error: any) {
    console.error('[Scraper] Instagram scraping failed:', error);
    return { success: false, trends: [], error: error.message, source: 'instagram_rapid' };
  }
}

/**
 * Scrape YouTube trending via official API
 */
async function scrapeYouTubeTrending(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping YouTube trending...');
  
  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    console.warn('[Scraper] YouTube API key not found');
    return { success: false, trends: [], error: 'API key missing', source: 'youtube_api' };
  }

  try {
    // Get trending videos
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('videoCategoryId', '0'); // All categories
    url.searchParams.set('maxResults', '20');
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetchWithRetry(url.toString());
    const data = await response.json();
    const trends: ScrapedTrend[] = [];

    if (data.items) {
      for (const item of data.items) {
        const duration = parseYouTubeDuration(item.contentDetails.duration);
        
        // Only include shorts (under 60 seconds)
        if (duration && duration < 61) {
          trends.push({
            title: item.snippet.title,
            description: item.snippet.description,
            platform: 'youtube',
            source_url: `https://www.youtube.com/watch?v=${item.id}`,
            hashtags: extractHashtags(item.snippet.description || ''),
            views: parseInt(item.statistics.viewCount || '0'),
            likes: parseInt(item.statistics.likeCount || '0'),
            comments: parseInt(item.statistics.commentCount || '0'),
            duration,
          });
        }
      }
    }

    console.log(`[Scraper] YouTube: Found ${trends.length} shorts trends`);
    return { success: true, trends, source: 'youtube_api' };
    
  } catch (error: any) {
    console.error('[Scraper] YouTube scraping failed:', error);
    return { success: false, trends: [], error: error.message, source: 'youtube_api' };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches ? matches.slice(0, 10) : [];
}

function parseYouTubeDuration(isoDuration: string): number | null {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  
  if (!matches) return null;
  
  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// ============================================================================
// MAIN SCRAPER ORCHESTRATOR
// ============================================================================

export async function runTrendScrapers(): Promise<void> {
  console.log('[Scraper] Starting trend scraping cycle...');
  
  const results: ScraperResult[] = [];

  // Run scrapers in sequence with delays
  results.push(await scrapeTikTokCreativeCenter());
  await delay(REQUEST_DELAY_MS);
  
  results.push(await scrapeInstagramTrends());
  await delay(REQUEST_DELAY_MS);
  
  results.push(await scrapeYouTubeTrending());

  // Store raw results
  for (const result of results) {
    await updateScraperStatus(result);
    
    if (result.success) {
      for (const trend of result.trends) {
        await storeRawTrend(trend, result.source);
      }
    }
  }

  console.log('[Scraper] Scraping cycle complete');
}

// ============================================================================
// DATABASE STORAGE
// ============================================================================

async function storeRawTrend(trend: ScrapedTrend, source: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('trend_raw_data')
      .insert({
        source,
        raw_payload: trend,
        processed: false,
      });

    if (error) {
      console.error('[Scraper] Failed to store raw trend:', error);
    }
  } catch (error) {
    console.error('[Scraper] Storage error:', error);
  }
}

async function updateScraperStatus(result: ScraperResult): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', result.source)
      .single();

    const updates = {
      last_run_at: new Date().toISOString(),
      total_runs: (existing?.total_runs || 0) + 1,
    };

    if (result.success) {
      Object.assign(updates, {
        last_success_at: new Date().toISOString(),
        total_successes: (existing?.total_successes || 0) + 1,
        last_error: null,
      });
    } else {
      Object.assign(updates, {
        total_failures: (existing?.total_failures || 0) + 1,
        last_error: result.error,
      });
    }

    await supabase
      .from('scraper_status')
      .upsert({
        scraper_name: result.source,
        ...updates,
        updated_at: new Date().toISOString(),
      });

  } catch (error) {
    console.error('[Scraper] Failed to update status:', error);
  }
}
"
