// Trend Scraper Worker
// Runs every 6 hours to scrape trends from aggregator sources

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
];
const REQUEST_DELAY_MS = 2000;
const MAX_RETRIES = 3;

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
}

interface ScraperResult {
  success: boolean;
  trends: ScrapedTrend[];
  error?: string;
  source: string;
}

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  console.log(`[Scraper] Fetching: ${url}`);
  
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers as Record<string, string>,
  };

  for (let i = 0; i < MAX_RETRIES; i++) {
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
      if (i === MAX_RETRIES - 1) throw error;
      await delay(REQUEST_DELAY_MS);
    }
  }
  
  throw new Error('Max retries exceeded');
}

// TikTok Creative Center scraper
async function scrapeTikTokCreativeCenter(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping TikTok Creative Center...');
  
  try {
    const url = 'https://ads.tiktok.com/creative_radar_api/v1/popular_trend/list';
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: 1,
        limit: 20,
        period: 7,
        country_code: 'US',
      }),
    });

    const data = await response.json();
    const trends: ScrapedTrend[] = [];

    if (data.data?.list) {
      for (const item of data.data.list) {
        trends.push({
          title: item.trend_name || item.hashtag_name || 'TikTok Trend',
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

// Instagram trends scraper (via RapidAPI)
async function scrapeInstagramTrends(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping Instagram trends...');
  
  const RAPID_API_KEY = Deno.env.get('RAPID_API_KEY');
  
  if (!RAPID_API_KEY) {
    console.warn('[Scraper] RapidAPI key not found');
    return { success: false, trends: [], error: 'API key missing', source: 'instagram_rapid' };
  }

  try {
    const response = await fetchWithRetry(
      'https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag_posts?hashtag=trending',
      {
        headers: {
          'X-RapidAPI-Key': RAPID_API_KEY,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
        },
      }
    );

    const data = await response.json();
    const trends: ScrapedTrend[] = [];

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

// YouTube trending scraper
async function scrapeYouTubeTrending(): Promise<ScraperResult> {
  console.log('[Scraper] Scraping YouTube trending...');
  
  const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
  
  if (!YOUTUBE_API_KEY) {
    console.warn('[Scraper] YouTube API key not found');
    return { success: false, trends: [], error: 'API key missing', source: 'youtube_api' };
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('videoCategoryId', '0');
    url.searchParams.set('maxResults', '20');
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetchWithRetry(url.toString());
    const data = await response.json();
    const trends: ScrapedTrend[] = [];

    if (data.items) {
      for (const item of data.items) {
        const duration = parseYouTubeDuration(item.contentDetails?.duration || '');
        
        if (duration && duration < 61) {
          trends.push({
            title: item.snippet.title,
            description: item.snippet.description,
            platform: 'youtube',
            source_url: `https://www.youtube.com/watch?v=${item.id}`,
            hashtags: extractHashtags(item.snippet.description || ''),
            views: parseInt(item.statistics?.viewCount || '0'),
            likes: parseInt(item.statistics?.likeCount || '0'),
            comments: parseInt(item.statistics?.commentCount || '0'),
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

// Store raw trend data
async function storeRawTrend(
  supabase: any,
  trend: ScrapedTrend,
  source: string
): Promise<void> {
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

// Update scraper status
async function updateScraperStatus(
  supabase: any,
  result: ScraperResult
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', result.source)
      .maybeSingle();

    const updates: any = {
      scraper_name: result.source,
      last_run_at: new Date().toISOString(),
      total_runs: (existing?.total_runs || 0) + 1,
      is_enabled: true,
      updated_at: new Date().toISOString(),
    };

    if (result.success) {
      updates.last_success_at = new Date().toISOString();
      updates.total_successes = (existing?.total_successes || 0) + 1;
      updates.last_error = null;
    } else {
      updates.total_failures = (existing?.total_failures || 0) + 1;
      updates.last_error = result.error;
    }

    await supabase
      .from('scraper_status')
      .upsert(updates, { onConflict: 'scraper_name' });

  } catch (error) {
    console.error('[Scraper] Failed to update status:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Scraper Worker] Starting trend scraping cycle...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: ScraperResult[] = [];

    // Run scrapers in sequence with delays
    results.push(await scrapeTikTokCreativeCenter());
    await delay(REQUEST_DELAY_MS);
    
    results.push(await scrapeInstagramTrends());
    await delay(REQUEST_DELAY_MS);
    
    results.push(await scrapeYouTubeTrending());

    // Store results and update status
    let totalTrends = 0;
    let successfulScrapers = 0;

    for (const result of results) {
      await updateScraperStatus(supabase, result);
      
      if (result.success) {
        successfulScrapers++;
        for (const trend of result.trends) {
          await storeRawTrend(supabase, trend, result.source);
          totalTrends++;
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Scraper Worker] Cycle complete in ${duration}ms. Scraped ${totalTrends} trends from ${successfulScrapers}/3 scrapers.`);

    return new Response(
      JSON.stringify({
        success: true,
        totalTrends,
        successfulScrapers,
        duration,
        results: results.map(r => ({
          source: r.source,
          success: r.success,
          trendCount: r.trends.length,
          error: r.error,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Scraper Worker] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
