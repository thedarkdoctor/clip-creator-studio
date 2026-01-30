// Trend Scraper Worker - SocialKit API Integration
// Runs every 6 hours to scrape trends from SocialKit endpoints

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const FETCH_TIMEOUT_MS = 30000;

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
  published_at?: string;
  author?: string;
}

interface ScraperResult {
  success: boolean;
  trends: ScrapedTrend[];
  error?: string;
  source: string;
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
  const matches = text.match(/#[\w\u0600-\u06FF]+/g);
  return matches ? matches.slice(0, 10) : [];
}

// TikTok Hashtag Search via SocialKit
async function scrapeTikTokTrends(apiKey: string): Promise<ScraperResult> {
  console.log('[Scraper] Fetching TikTok trends via SocialKit...');
  
  const trends: ScrapedTrend[] = [];
  
  try {
    const url = `https://api.socialkit.dev/tiktok/hashtag-search?access_key=${apiKey}&hashtag=viral&limit=15`;
    console.log('[Scraper] Calling SocialKit TikTok API...');
    
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const data = await response.json();
    
    console.log('[Scraper] Response success:', data.success, 'results:', data.data?.results?.length || 0);
    
    if (data.success && data.data?.results) {
      for (const item of data.data.results) {
        // Extract stats from the correct nested structure
        const stats = item.stats || {};
        const video = item.video || {};
        const author = item.author || {};
        const music = item.music || {};
        
        trends.push({
          title: item.desc?.slice(0, 100) || 'TikTok Trend',
          description: item.desc,
          platform: 'tiktok',
          source_url: item.url || `https://www.tiktok.com/@${author.uniqueId}/video/${item.id}`,
          hashtags: extractHashtags(item.desc || ''),
          // Stats from the stats object
          views: stats.views || stats.playCount,
          likes: stats.likes || stats.diggCount,
          comments: stats.comments || stats.commentCount,
          shares: stats.shares || stats.shareCount,
          // Video metadata
          duration: video.duration || item.duration,
          // Music/audio info
          audio_name: music.title || music.author,
          // Author info
          author: author.nickname || author.uniqueId,
          // Timestamp
          published_at: item.createTime 
            ? new Date(item.createTime * 1000).toISOString() 
            : undefined,
        });
      }
    }
    
    console.log(`[Scraper] TikTok: Found ${trends.length} trends with stats`);
    return { success: trends.length > 0, trends, source: 'socialkit_tiktok' };
    
  } catch (error: any) {
    console.error('[Scraper] TikTok error:', error.message);
    return { success: false, trends: [], error: error.message, source: 'socialkit_tiktok' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Scraper Worker] Starting trend scraping...');
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

    // Scrape TikTok trends
    const result = await scrapeTikTokTrends(socialKitApiKey);
    
    // Update scraper status
    const { data: existing } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', result.source)
      .maybeSingle();

    await supabase.from('scraper_status').upsert({
      scraper_name: result.source,
      last_run_at: new Date().toISOString(),
      last_success_at: result.success ? new Date().toISOString() : existing?.last_success_at,
      total_runs: (existing?.total_runs || 0) + 1,
      total_successes: (existing?.total_successes || 0) + (result.success ? 1 : 0),
      total_failures: (existing?.total_failures || 0) + (result.success ? 0 : 1),
      last_error: result.error || null,
      is_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'scraper_name' });

    // Store trends
    let storedCount = 0;
    if (result.success) {
      for (const trend of result.trends) {
        const { error } = await supabase.from('trend_raw_data').insert({
          source: result.source,
          raw_payload: trend,
          processed: false,
        });
        if (!error) storedCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Scraper Worker] Done in ${duration}ms. Stored ${storedCount} trends.`);

    return new Response(
      JSON.stringify({
        success: result.success,
        totalTrends: storedCount,
        duration,
        source: result.source,
        error: result.error,
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
