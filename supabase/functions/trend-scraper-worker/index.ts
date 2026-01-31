// Trend Scraper Worker - TikTok via SocialKit API (Primary Source)
// Runs every 6 hours to scrape trends using multiple hashtag searches

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const FETCH_TIMEOUT_MS = 30000;

// Trending hashtags to scrape - diverse niches
const TRENDING_HASHTAGS = [
  'viral',
  'fyp',
  'trending',
  'foryou',
  'pov',
  'challenge',
  'dance',
  'tutorial',
  'funny',
  'comedy',
  'beauty',
  'fitness',
  'food',
  'fashion',
  'lifestyle',
];

interface ScrapedTrend {
  title: string;
  description?: string;
  platform: 'tiktok';
  source_url: string;
  hashtags: string[];
  views: number;
  likes: number;
  shares: number;
  comments: number;
  audio_name?: string;
  duration?: number;
  published_at?: string;
  author?: string;
}

interface ScraperResult {
  success: boolean;
  trends: ScrapedTrend[];
  error?: string;
  hashtag: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error.name === 'AbortError' ? new Error('Request timeout') : error;
  }
}

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\w\u0600-\u06FF\u4e00-\u9fff]+/g);
  return matches ? matches.slice(0, 10) : [];
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return 0;
}

// Scrape TikTok trends for a specific hashtag
async function scrapeTikTokHashtag(apiKey: string, hashtag: string): Promise<ScraperResult> {
  console.log(`[Scraper] Fetching TikTok #${hashtag} trends...`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    const url = `https://api.socialkit.dev/tiktok/hashtag-search?access_key=${apiKey}&hashtag=${encodeURIComponent(hashtag)}&limit=20`;
    
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const data = await response.json();
    
    if (data.success && data.data?.results) {
      for (const item of data.data.results) {
        const stats = item.stats || {};
        const video = item.video || {};
        const author = item.author || {};
        const music = item.music || {};
        const desc = item.desc || '';
        
        // Skip if no meaningful content
        if (!desc && !item.id) continue;
        
        trends.push({
          title: desc.slice(0, 200) || `TikTok #${hashtag}`,
          description: desc,
          platform: 'tiktok',
          source_url: item.url || `https://www.tiktok.com/@${author.uniqueId || 'user'}/video/${item.id}`,
          hashtags: extractHashtags(desc),
          views: parseNumericValue(stats.views || stats.playCount || 0),
          likes: parseNumericValue(stats.likes || stats.diggCount || 0),
          comments: parseNumericValue(stats.comments || stats.commentCount || 0),
          shares: parseNumericValue(stats.shares || stats.shareCount || 0),
          duration: parseNumericValue(video.duration || item.duration || 0),
          audio_name: music.title || music.author || undefined,
          author: author.nickname || author.uniqueId || undefined,
          published_at: item.createTime 
            ? new Date(item.createTime * 1000).toISOString() 
            : undefined,
        });
      }
    }
    
    console.log(`[Scraper] #${hashtag}: Found ${trends.length} trends`);
    return { success: trends.length > 0, trends, hashtag };
    
  } catch (error: any) {
    console.error(`[Scraper] #${hashtag} error:`, error.message);
    return { success: false, trends: [], error: error.message, hashtag };
  }
}

// Check for duplicate URLs to avoid re-scraping same content
async function filterExistingTrends(supabase: any, trends: ScrapedTrend[]): Promise<ScrapedTrend[]> {
  if (trends.length === 0) return [];
  
  const urls = trends.map(t => t.source_url);
  
  // Check existing in trend_raw_data
  const { data: existing } = await supabase
    .from('trend_raw_data')
    .select('raw_payload')
    .in('raw_payload->>source_url', urls);
  
  const existingUrls = new Set(
    (existing || []).map((e: any) => e.raw_payload?.source_url)
  );
  
  return trends.filter(t => !existingUrls.has(t.source_url));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Scraper Worker] Starting TikTok trend scraping...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const socialKitApiKey = Deno.env.get('SOCIALKIT_API_KEY');
    
    if (!socialKitApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'SOCIALKIT_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalTrends = 0;
    let totalStored = 0;
    const results: { hashtag: string; found: number; stored: number }[] = [];

    // Scrape each trending hashtag
    for (const hashtag of TRENDING_HASHTAGS) {
      const result = await scrapeTikTokHashtag(socialKitApiKey, hashtag);
      
      // Update scraper status for this hashtag
      const scraperName = `tiktok_${hashtag}`;
      const { data: existing } = await supabase
        .from('scraper_status')
        .select('*')
        .eq('scraper_name', scraperName)
        .maybeSingle();

      await supabase.from('scraper_status').upsert({
        scraper_name: scraperName,
        last_run_at: new Date().toISOString(),
        last_success_at: result.success ? new Date().toISOString() : existing?.last_success_at,
        total_runs: (existing?.total_runs || 0) + 1,
        total_successes: (existing?.total_successes || 0) + (result.success ? 1 : 0),
        total_failures: (existing?.total_failures || 0) + (result.success ? 0 : 1),
        last_error: result.error || null,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'scraper_name' });

      if (result.success && result.trends.length > 0) {
        // Filter out duplicates
        const newTrends = await filterExistingTrends(supabase, result.trends);
        
        totalTrends += result.trends.length;
        
        // Store new trends
        for (const trend of newTrends) {
          const { error } = await supabase.from('trend_raw_data').insert({
            source: 'socialkit_tiktok',
            raw_payload: trend,
            processed: false,
          });
          if (!error) totalStored++;
        }
        
        results.push({ hashtag, found: result.trends.length, stored: newTrends.length });
      } else {
        results.push({ hashtag, found: 0, stored: 0 });
      }
      
      // Small delay between requests to be nice to the API
      await new Promise(r => setTimeout(r, 500));
    }

    // Update main scraper status
    const { data: mainStatus } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', 'socialkit_tiktok')
      .maybeSingle();

    await supabase.from('scraper_status').upsert({
      scraper_name: 'socialkit_tiktok',
      last_run_at: new Date().toISOString(),
      last_success_at: totalStored > 0 ? new Date().toISOString() : mainStatus?.last_success_at,
      total_runs: (mainStatus?.total_runs || 0) + 1,
      total_successes: (mainStatus?.total_successes || 0) + (totalStored > 0 ? 1 : 0),
      total_failures: (mainStatus?.total_failures || 0) + (totalStored === 0 ? 1 : 0),
      is_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'scraper_name' });

    const duration = Date.now() - startTime;
    console.log(`[Scraper Worker] Done in ${duration}ms. Found: ${totalTrends}, Stored: ${totalStored}`);

    return new Response(
      JSON.stringify({
        success: totalStored > 0,
        totalFound: totalTrends,
        totalStored,
        duration,
        hashtags: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Scraper Worker] Fatal error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
