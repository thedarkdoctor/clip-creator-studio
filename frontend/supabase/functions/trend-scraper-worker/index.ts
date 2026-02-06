// Trend Scraper Worker - RapidAPI Multi-Platform (TikTok, Instagram, YouTube)
// Uses the specific RapidAPI endpoints from user's subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 30000;

// Popular trending music IDs on TikTok for discovery
const TRENDING_MUSIC_IDS = [
  '7224128604890990593', // Example trending sound
  '7351767631878261510', // Popular sound
  '7288728373367839494', // Viral music
  '7325959228295449349', // Trending audio
  '7305999025177177898', // Popular track
];

// Niche-to-search mapping
const NICHE_SEARCH_TERMS: Record<string, string[]> = {
  'Tech & Software': ['tech', 'coding', 'programming', 'AI', 'software'],
  'Fitness & Health': ['fitness', 'workout', 'gym', 'health', 'nutrition'],
  'Business & Finance': ['business', 'entrepreneur', 'investing', 'finance'],
  'Lifestyle & Vlogging': ['lifestyle', 'vlog', 'routine', 'dayinmylife'],
  'Gaming': ['gaming', 'gamer', 'gameplay', 'twitch', 'esports'],
  'Education': ['education', 'learning', 'tutorial', 'howto', 'study'],
  'Food & Cooking': ['food', 'cooking', 'recipe', 'foodie', 'chef'],
  'Fashion & Beauty': ['fashion', 'beauty', 'makeup', 'style', 'skincare'],
  'Travel': ['travel', 'wanderlust', 'adventure', 'vacation', 'explore'],
  'Entertainment': ['entertainment', 'funny', 'comedy', 'viral', 'trending'],
  'Music': ['music', 'singer', 'musician', 'song', 'cover'],
  'Other': ['viral', 'trending', 'fyp'],
};

interface ScrapedTrend {
  title: string;
  description?: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // LOG: Full request details
  console.log(`[API REQUEST] URL: ${url}`);
  console.log(`[API REQUEST] Method: ${options.method || 'GET'}`);
  console.log(`[API REQUEST] Headers:`, JSON.stringify(options.headers));
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    
    // LOG: Response status
    console.log(`[API RESPONSE] Status: ${response.status} ${response.statusText}`);
    console.log(`[API RESPONSE] Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[API ERROR] ${error.message}`);
    throw error.name === 'AbortError' ? new Error('Request timeout') : error;
  }
}

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\w\u0600-\u06FF\u4e00-\u9fff]+/g);
  return matches ? matches.map(h => h.toLowerCase()).slice(0, 10) : [];
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,\s]/g, ''));
    if (!isNaN(num)) return num;
  }
  return 0;
}

// ============================================================================
// TIKTOK SCRAPER - Uses /api/music/posts endpoint
// ============================================================================

async function scrapeTikTokByMusic(apiKey: string, apiHost: string, musicId: string): Promise<ScrapedTrend[]> {
  console.log(`[TikTok Music] ========== Starting scrape for music ID: ${musicId} ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    const url = `https://${apiHost}/api/music/posts?musicId=${musicId}&count=30&cursor=0`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[TikTok Music] Raw response keys:`, Object.keys(data));
    console.log(`[TikTok Music] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    // Handle different response structures
    const items = data?.data?.videos || data?.itemList || data?.data?.itemList || data?.items || [];
    
    console.log(`[TikTok Music] Found ${items.length} items in response`);
    
    if (items.length > 0) {
      console.log(`[TikTok Music] First item structure:`, JSON.stringify(items[0]));
      console.log(`[TikTok Music] First item keys:`, Object.keys(items[0]));
    }
    
    for (const item of items) {
      const stats = item.stats || item.statistics || {};
      const author = item.author || {};
      const music = item.music || {};
      const desc = item.desc || item.description || '';
      
      if (!item.id) {
        console.log(`[TikTok Music] Skipping item without ID`);
        continue;
      }
      
      const trend = {
        title: desc.slice(0, 200) || `TikTok Trending`,
        description: desc,
        platform: 'tiktok' as const,
        source_url: `https://www.tiktok.com/@${author.uniqueId || 'user'}/video/${item.id}`,
        hashtags: extractHashtags(desc),
        views: parseNumericValue(stats.playCount || stats.views || item.playCount || 0),
        likes: parseNumericValue(stats.diggCount || stats.likes || item.diggCount || 0),
        comments: parseNumericValue(stats.commentCount || stats.comments || item.commentCount || 0),
        shares: parseNumericValue(stats.shareCount || stats.shares || item.shareCount || 0),
        duration: parseNumericValue(item.duration || item.video?.duration || 0),
        audio_name: music.title || music.author || undefined,
        author: author.nickname || author.uniqueId || undefined,
        published_at: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
      };
      
      console.log(`[TikTok Music] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views} | Likes: ${trend.likes}`);
      trends.push(trend);
    }
    
    console.log(`[TikTok Music] Successfully parsed ${trends.length} trends from music ${musicId}`);
    
  } catch (error: any) {
    console.error(`[TikTok Music] Error scraping music ${musicId}:`, error.message);
    console.error(`[TikTok Music] Error stack:`, error.stack);
  }
  
  return trends;
}

// Try to get trending feed or user feed
async function scrapeTikTokTrending(apiKey: string, apiHost: string): Promise<ScrapedTrend[]> {
  console.log(`[TikTok Trending] ========== Starting trending feed scrape ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    // Try feed endpoint
    const url = `https://${apiHost}/api/feed/list?count=30`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[TikTok Trending] Raw response keys:`, Object.keys(data));
    console.log(`[TikTok Trending] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    const items = data?.data?.videos || data?.itemList || data?.items || [];
    
    console.log(`[TikTok Trending] Found ${items.length} items in response`);
    
    if (items.length > 0) {
      console.log(`[TikTok Trending] First item structure:`, JSON.stringify(items[0]));
    }
    
    for (const item of items) {
      const stats = item.stats || {};
      const author = item.author || {};
      const music = item.music || {};
      const desc = item.desc || '';
      
      if (!item.id) {
        console.log(`[TikTok Trending] Skipping item without ID`);
        continue;
      }
      
      const trend = {
        title: desc.slice(0, 200) || 'TikTok Trending',
        description: desc,
        platform: 'tiktok' as const,
        source_url: `https://www.tiktok.com/@${author.uniqueId || 'user'}/video/${item.id}`,
        hashtags: extractHashtags(desc),
        views: parseNumericValue(stats.playCount || item.playCount || 0),
        likes: parseNumericValue(stats.diggCount || item.diggCount || 0),
        comments: parseNumericValue(stats.commentCount || item.commentCount || 0),
        shares: parseNumericValue(stats.shareCount || item.shareCount || 0),
        duration: parseNumericValue(item.duration || 0),
        audio_name: music.title || undefined,
        author: author.nickname || author.uniqueId || undefined,
        published_at: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
      };
      
      console.log(`[TikTok Trending] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views}`);
      trends.push(trend);
    }
    
    console.log(`[TikTok Trending] Successfully parsed ${trends.length} trends`);
    
  } catch (error: any) {
    console.error(`[TikTok Trending] Error:`, error.message);
    console.error(`[TikTok Trending] Error stack:`, error.stack);
  }
  
  return trends;
}

// ============================================================================
// INSTAGRAM SCRAPER - Uses /search and /hashtag endpoints
// ============================================================================

async function scrapeInstagramHashtag(apiKey: string, apiHost: string, query: string): Promise<ScrapedTrend[]> {
  console.log(`[Instagram Hashtag] ========== Starting scrape for: #${query} ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    // Try hashtag endpoint
    const url = `https://${apiHost}/hashtag?name=${encodeURIComponent(query)}`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[Instagram Hashtag] Raw response keys:`, Object.keys(data));
    console.log(`[Instagram Hashtag] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    // Parse media from hashtag response
    const edges = data?.edge_hashtag_to_media?.edges || 
                  data?.data?.edge_hashtag_to_media?.edges ||
                  data?.items || [];
    
    console.log(`[Instagram Hashtag] Found ${edges.length} edges/items in response`);
    
    if (edges.length > 0) {
      console.log(`[Instagram Hashtag] First edge structure:`, JSON.stringify(edges[0]));
    }
    
    for (const edge of edges) {
      const node = edge?.node || edge;
      if (!node) {
        console.log(`[Instagram Hashtag] Skipping empty node`);
        continue;
      }
      
      // Only get videos (Reels)
      const isVideo = node.is_video || node.__typename === 'GraphVideo' || node.media_type === 2;
      if (!isVideo) {
        console.log(`[Instagram Hashtag] Skipping non-video content`);
        continue;
      }
      
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || 
                      node.caption?.text || 
                      node.caption || '';
      
      const trend = {
        title: caption.slice(0, 200) || `Instagram #${query}`,
        description: caption,
        platform: 'instagram' as const,
        source_url: node.shortcode 
          ? `https://www.instagram.com/reel/${node.shortcode}/`
          : `https://www.instagram.com/p/${node.id}/`,
        hashtags: extractHashtags(caption),
        views: parseNumericValue(node.video_view_count || node.play_count || 0),
        likes: parseNumericValue(node.edge_liked_by?.count || node.like_count || 0),
        comments: parseNumericValue(node.edge_media_to_comment?.count || node.comment_count || 0),
        shares: 0,
        duration: parseNumericValue(node.video_duration || 0),
        author: node.owner?.username || undefined,
        published_at: node.taken_at_timestamp 
          ? new Date(node.taken_at_timestamp * 1000).toISOString() 
          : undefined,
      };
      
      console.log(`[Instagram Hashtag] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views} | Likes: ${trend.likes}`);
      trends.push(trend);
    }
    
    console.log(`[Instagram Hashtag] Successfully parsed ${trends.length} reels for ${query}`);
    
  } catch (error: any) {
    console.error(`[Instagram Hashtag] Error scraping ${query}:`, error.message);
    console.error(`[Instagram Hashtag] Error stack:`, error.stack);
  }
  
  return trends;
}

// Try search endpoint as fallback
async function scrapeInstagramSearch(apiKey: string, apiHost: string, query: string): Promise<ScrapedTrend[]> {
  console.log(`[Instagram Search] ========== Starting search for: ${query} ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    const url = `https://${apiHost}/search?query=${encodeURIComponent(query)}&select=posts`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[Instagram Search] Raw response keys:`, Object.keys(data));
    console.log(`[Instagram Search] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    const posts = data?.posts || data?.items || data?.data?.posts || [];
    
    console.log(`[Instagram Search] Found ${posts.length} posts in response`);
    
    if (posts.length > 0) {
      console.log(`[Instagram Search] First post structure:`, JSON.stringify(posts[0]));
    }
    
    for (const post of posts) {
      const isVideo = post.is_video || post.media_type === 2;
      if (!isVideo) {
        console.log(`[Instagram Search] Skipping non-video post`);
        continue;
      }
      
      const caption = post.caption?.text || post.caption || post.title || '';
      
      const trend = {
        title: caption.slice(0, 200) || `Instagram ${query}`,
        description: caption,
        platform: 'instagram' as const,
        source_url: post.shortcode 
          ? `https://www.instagram.com/reel/${post.shortcode}/`
          : `https://www.instagram.com/p/${post.id}/`,
        hashtags: extractHashtags(caption),
        views: parseNumericValue(post.video_view_count || post.play_count || 0),
        likes: parseNumericValue(post.like_count || 0),
        comments: parseNumericValue(post.comment_count || 0),
        shares: 0,
        duration: parseNumericValue(post.video_duration || 0),
        author: post.user?.username || post.owner?.username || undefined,
        published_at: post.taken_at ? new Date(post.taken_at * 1000).toISOString() : undefined,
      };
      
      console.log(`[Instagram Search] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views}`);
      trends.push(trend);
    }
    
    console.log(`[Instagram Search] Successfully parsed ${trends.length} videos from search`);
    
  } catch (error: any) {
    console.error(`[Instagram Search] Error:`, error.message);
    console.error(`[Instagram Search] Error stack:`, error.stack);
  }
  
  return trends;
}

// ============================================================================
// YOUTUBE SCRAPER - Uses /search endpoint
// ============================================================================

async function scrapeYouTubeSearch(apiKey: string, apiHost: string, query: string): Promise<ScrapedTrend[]> {
  console.log(`[YouTube Search] ========== Starting search for: ${query} shorts ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    // Try search endpoint for shorts
    const url = `https://${apiHost}/search?query=${encodeURIComponent(query + ' shorts')}&lang=en&order=viewCount`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[YouTube Search] Raw response keys:`, Object.keys(data));
    console.log(`[YouTube Search] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    const videos = data?.videos || data?.items || data?.contents || data?.data || [];
    
    console.log(`[YouTube Search] Found ${videos.length} videos in response`);
    
    if (videos.length > 0) {
      console.log(`[YouTube Search] First video structure:`, JSON.stringify(videos[0]));
    }
    
    for (const video of videos) {
      const videoId = video.videoId || video.id?.videoId || video.id;
      if (!videoId) {
        console.log(`[YouTube Search] Skipping video without ID`);
        continue;
      }
      
      const title = video.title || video.snippet?.title || '';
      const description = video.description || video.snippet?.description || '';
      
      // Parse views
      let views = 0;
      const viewStr = video.viewCount || video.view_count || video.statistics?.viewCount || video.views || '';
      if (typeof viewStr === 'string') {
        const match = viewStr.match(/[\d,.]+/);
        if (match) {
          let num = parseFloat(match[0].replace(/,/g, ''));
          if (viewStr.toLowerCase().includes('k')) num *= 1000;
          if (viewStr.toLowerCase().includes('m')) num *= 1000000;
          if (viewStr.toLowerCase().includes('b')) num *= 1000000000;
          views = Math.round(num);
        }
      } else {
        views = parseNumericValue(viewStr);
      }
      
      const trend = {
        title: title.slice(0, 200) || `YouTube ${query}`,
        description: description,
        platform: 'youtube' as const,
        source_url: `https://www.youtube.com/shorts/${videoId}`,
        hashtags: extractHashtags(`${title} ${description}`),
        views: views,
        likes: parseNumericValue(video.likeCount || video.statistics?.likeCount || 0),
        comments: parseNumericValue(video.commentCount || video.statistics?.commentCount || 0),
        shares: 0,
        duration: parseNumericValue(video.lengthSeconds || video.duration || 60),
        author: video.channelTitle || video.channel?.name || video.ownerText || undefined,
        published_at: video.publishedAt || video.publishDate || undefined,
      };
      
      console.log(`[YouTube Search] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views} | Likes: ${trend.likes}`);
      trends.push(trend);
    }
    
    console.log(`[YouTube Search] Successfully parsed ${trends.length} shorts for ${query}`);
    
  } catch (error: any) {
    console.error(`[YouTube Search] Error:`, error.message);
    console.error(`[YouTube Search] Error stack:`, error.stack);
  }
  
  return trends;
}

// Try trending/popular endpoint
async function scrapeYouTubeTrending(apiKey: string, apiHost: string): Promise<ScrapedTrend[]> {
  console.log(`[YouTube Trending] ========== Starting trending feed scrape ==========`);
  
  const trends: ScrapedTrend[] = [];
  
  try {
    const url = `https://${apiHost}/trending?type=now&geo=US&lang=en`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
    }, FETCH_TIMEOUT_MS);
    
    const data = await response.json();
    
    // LOG: Raw response structure
    console.log(`[YouTube Trending] Raw response keys:`, Object.keys(data));
    console.log(`[YouTube Trending] Full response (first 1000 chars):`, JSON.stringify(data).slice(0, 1000));
    
    const videos = data?.videos || data?.items || [];
    
    console.log(`[YouTube Trending] Found ${videos.length} videos in response`);
    
    if (videos.length > 0) {
      console.log(`[YouTube Trending] First video structure:`, JSON.stringify(videos[0]));
    }
    
    for (const video of videos.slice(0, 20)) {
      const videoId = video.videoId || video.id;
      if (!videoId) {
        console.log(`[YouTube Trending] Skipping video without ID`);
        continue;
      }
      
      const title = video.title || '';
      
      const trend = {
        title: title.slice(0, 200) || 'YouTube Trending',
        description: video.description || '',
        platform: 'youtube' as const,
        source_url: `https://www.youtube.com/watch?v=${videoId}`,
        hashtags: extractHashtags(title),
        views: parseNumericValue(video.viewCount || 0),
        likes: parseNumericValue(video.likeCount || 0),
        comments: parseNumericValue(video.commentCount || 0),
        shares: 0,
        duration: 0,
        author: video.channelTitle || undefined,
        published_at: video.publishedAt || undefined,
      };
      
      console.log(`[YouTube Trending] Parsed trend: ${trend.title.slice(0, 50)}... | Views: ${trend.views}`);
      trends.push(trend);
    }
    
    console.log(`[YouTube Trending] Successfully parsed ${trends.length} trends`);
    
  } catch (error: any) {
    console.error(`[YouTube Trending] Error:`, error.message);
    console.error(`[YouTube Trending] Error stack:`, error.stack);
  }
  
  return trends;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function filterExistingTrends(supabase: any, trends: ScrapedTrend[]): Promise<ScrapedTrend[]> {
  if (trends.length === 0) {
    console.log(`[Filter] No trends to filter`);
    return [];
  }
  
  console.log(`[Filter] Checking ${trends.length} trends against database...`);
  
  const urls = trends.map(t => t.source_url);
  
  const { data: existing } = await supabase
    .from('trend_raw_data')
    .select('raw_payload')
    .in('raw_payload->>source_url', urls);
  
  const existingUrls = new Set(
    (existing || []).map((e: any) => e.raw_payload?.source_url)
  );
  
  console.log(`[Filter] Found ${existingUrls.size} existing trends in database`);
  
  const newTrends = trends.filter(t => !existingUrls.has(t.source_url));
  
  console.log(`[Filter] ${newTrends.length} new trends to store`);
  
  return newTrends;
}

async function updateScraperStatus(supabase: any, name: string, success: boolean, error?: string) {
  const { data: existing } = await supabase
    .from('scraper_status')
    .select('*')
    .eq('scraper_name', name)
    .maybeSingle();

  await supabase.from('scraper_status').upsert({
    scraper_name: name,
    last_run_at: new Date().toISOString(),
    last_success_at: success ? new Date().toISOString() : existing?.last_success_at,
    total_runs: (existing?.total_runs || 0) + 1,
    total_successes: (existing?.total_successes || 0) + (success ? 1 : 0),
    total_failures: (existing?.total_failures || 0) + (success ? 0 : 1),
    last_error: error || null,
    is_enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'scraper_name' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('========================================');
  console.log('[Scraper Worker] ========== STARTING MULTI-PLATFORM TREND SCRAPING ==========');
  console.log('========================================');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Platform-specific credentials
    const tiktokApiKey = Deno.env.get('TIKTOK_RAPIDAPI_KEY');
    const tiktokApiHost = Deno.env.get('TIKTOK_RAPIDAPI_HOST');
    const instagramApiKey = Deno.env.get('INSTAGRAM_RAPIDAPI_KEY');
    const instagramApiHost = Deno.env.get('INSTAGRAM_RAPIDAPI_HOST');
    const youtubeApiKey = Deno.env.get('YOUTUBE_RAPIDAPI_KEY');
    const youtubeApiHost = Deno.env.get('YOUTUBE_RAPIDAPI_HOST');
    
    console.log('[Config] Environment variables loaded:');
    console.log(`  - TikTok API Key: ${tiktokApiKey ? '✓ SET' : '✗ MISSING'}`);
    console.log(`  - TikTok API Host: ${tiktokApiHost || '✗ MISSING'}`);
    console.log(`  - Instagram API Key: ${instagramApiKey ? '✓ SET' : '✗ MISSING'}`);
    console.log(`  - Instagram API Host: ${instagramApiHost || '✗ MISSING'}`);
    console.log(`  - YouTube API Key: ${youtubeApiKey ? '✓ SET' : '✗ MISSING'}`);
    console.log(`  - YouTube API Host: ${youtubeApiHost || '✗ MISSING'}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request
    let requestedPlatforms: string[] = [];
    let requestedNiche: string = '';
    
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        requestedPlatforms = body.platforms || [];
        requestedNiche = body.niche || '';
        console.log('[Config] Request body:', JSON.stringify(body));
      }
    } catch {
      console.log('[Config] No request body or failed to parse');
    }
    
    // Get search terms based on niche
    const searchTerms = requestedNiche && NICHE_SEARCH_TERMS[requestedNiche]
      ? NICHE_SEARCH_TERMS[requestedNiche]
      : ['viral', 'trending', 'fyp'];
    
    console.log(`[Config] Niche: ${requestedNiche || 'default'}`);
    console.log(`[Config] Search terms: ${searchTerms.join(', ')}`);
    console.log(`[Config] Requested platforms: ${requestedPlatforms.join(', ') || 'all'}`);

    let totalTrends = 0;
    let totalStored = 0;
    const results: { platform: string; source: string; found: number; stored: number }[] = [];
    const errors: string[] = [];

    // Helper to check if platform is requested
    const shouldScrape = (platform: string) => {
      if (requestedPlatforms.length === 0) return true;
      return requestedPlatforms.some(p => p.toLowerCase() === platform.toLowerCase());
    };

    // ========== TIKTOK ==========
    if (tiktokApiKey && tiktokApiHost && shouldScrape('tiktok')) {
      console.log('');
      console.log('==================== TIKTOK SCRAPING ====================');
      console.log(`[TikTok] API Host: ${tiktokApiHost}`);
      console.log(`[TikTok] API Key prefix: ${tiktokApiKey.substring(0, 10)}...`);
      
      let tiktokTrends: ScrapedTrend[] = [];
      
      // Try music-based discovery
      for (const musicId of TRENDING_MUSIC_IDS.slice(0, 2)) {
        const musicTrends = await scrapeTikTokByMusic(tiktokApiKey, tiktokApiHost, musicId);
        tiktokTrends.push(...musicTrends);
        await new Promise(r => setTimeout(r, 500));
      }
      
      console.log(`[TikTok] Total from music endpoints: ${tiktokTrends.length}`);
      
      // Try trending feed
      if (tiktokTrends.length < 10) {
        console.log(`[TikTok] Less than 10 trends from music, trying trending feed...`);
        const feedTrends = await scrapeTikTokTrending(tiktokApiKey, tiktokApiHost);
        tiktokTrends.push(...feedTrends);
      }
      
      console.log(`[TikTok] Total before niche filter: ${tiktokTrends.length}`);
      
      // Filter by niche if specified
      if (requestedNiche && searchTerms.length > 0) {
        const beforeFilter = tiktokTrends.length;
        tiktokTrends = tiktokTrends.filter(t => {
          const text = `${t.title} ${t.description || ''} ${t.hashtags.join(' ')}`.toLowerCase();
          return searchTerms.some(term => text.includes(term.toLowerCase()));
        });
        console.log(`[TikTok] After niche filter: ${tiktokTrends.length} (filtered out ${beforeFilter - tiktokTrends.length})`);
      }
      
      totalTrends += tiktokTrends.length;
      
      if (tiktokTrends.length > 0) {
        const newTrends = await filterExistingTrends(supabase, tiktokTrends);
        
        console.log(`[TikTok] Storing ${newTrends.length} new trends to database...`);
        
        for (const trend of newTrends) {
          const { error } = await supabase.from('trend_raw_data').insert({
            source: 'rapidapi_tiktok',
            raw_payload: trend,
            processed: false,
          });
          if (!error) {
            totalStored++;
          } else {
            console.error(`[TikTok] Failed to store trend:`, error);
          }
        }
        
        results.push({ platform: 'tiktok', source: 'music+feed', found: tiktokTrends.length, stored: newTrends.length });
        await updateScraperStatus(supabase, 'rapidapi_tiktok', true);
        console.log(`[TikTok] ✓ Success - Found: ${tiktokTrends.length}, Stored: ${newTrends.length}`);
      } else {
        results.push({ platform: 'tiktok', source: 'music+feed', found: 0, stored: 0 });
        await updateScraperStatus(supabase, 'rapidapi_tiktok', false, 'No trends found');
        console.log(`[TikTok] ✗ No trends found`);
      }
    } else {
      console.log('[TikTok] Skipping - credentials missing or platform not requested');
    }

    // ========== INSTAGRAM ==========
    if (instagramApiKey && instagramApiHost && shouldScrape('instagram')) {
      console.log('');
      console.log('==================== INSTAGRAM SCRAPING ====================');
      console.log(`[Instagram] API Host: ${instagramApiHost}`);
      console.log(`[Instagram] API Key prefix: ${instagramApiKey.substring(0, 10)}...`);
      
      let instagramTrends: ScrapedTrend[] = [];
      
      // Search by niche terms
      for (const term of searchTerms.slice(0, 2)) {
        console.log(`[Instagram] Searching term: ${term}`);
        const hashtagTrends = await scrapeInstagramHashtag(instagramApiKey, instagramApiHost, term);
        instagramTrends.push(...hashtagTrends);
        
        if (hashtagTrends.length === 0) {
          console.log(`[Instagram] No hashtag results, trying search endpoint...`);
          const searchTrends = await scrapeInstagramSearch(instagramApiKey, instagramApiHost, term);
          instagramTrends.push(...searchTrends);
        }
        
        await new Promise(r => setTimeout(r, 500));
      }
      
      console.log(`[Instagram] Total trends found: ${instagramTrends.length}`);
      totalTrends += instagramTrends.length;
      
      if (instagramTrends.length > 0) {
        const newTrends = await filterExistingTrends(supabase, instagramTrends);
        
        console.log(`[Instagram] Storing ${newTrends.length} new trends to database...`);
        
        for (const trend of newTrends) {
          const { error } = await supabase.from('trend_raw_data').insert({
            source: 'rapidapi_instagram',
            raw_payload: trend,
            processed: false,
          });
          if (!error) {
            totalStored++;
          } else {
            console.error(`[Instagram] Failed to store trend:`, error);
          }
        }
        
        results.push({ platform: 'instagram', source: 'hashtag+search', found: instagramTrends.length, stored: newTrends.length });
        await updateScraperStatus(supabase, 'rapidapi_instagram', true);
        console.log(`[Instagram] ✓ Success - Found: ${instagramTrends.length}, Stored: ${newTrends.length}`);
      } else {
        results.push({ platform: 'instagram', source: 'hashtag+search', found: 0, stored: 0 });
        await updateScraperStatus(supabase, 'rapidapi_instagram', false, 'No trends found');
        console.log(`[Instagram] ✗ No trends found`);
      }
    } else {
      console.log('[Instagram] Skipping - credentials missing or platform not requested');
    }

    // ========== YOUTUBE ==========
    if (youtubeApiKey && youtubeApiHost && shouldScrape('youtube')) {
      console.log('');
      console.log('==================== YOUTUBE SCRAPING ====================');
      console.log(`[YouTube] API Host: ${youtubeApiHost}`);
      console.log(`[YouTube] API Key prefix: ${youtubeApiKey.substring(0, 10)}...`);
      
      let youtubeTrends: ScrapedTrend[] = [];
      
      // Search by niche terms
      for (const term of searchTerms.slice(0, 2)) {
        console.log(`[YouTube] Searching term: ${term}`);
        const searchTrends = await scrapeYouTubeSearch(youtubeApiKey, youtubeApiHost, term);
        youtubeTrends.push(...searchTrends);
        await new Promise(r => setTimeout(r, 500));
      }
      
      console.log(`[YouTube] Total from search: ${youtubeTrends.length}`);
      
      // Try trending
      if (youtubeTrends.length < 10) {
        console.log(`[YouTube] Less than 10 trends from search, trying trending endpoint...`);
        const trendingTrends = await scrapeYouTubeTrending(youtubeApiKey, youtubeApiHost);
        youtubeTrends.push(...trendingTrends);
      }
      
      console.log(`[YouTube] Total trends found: ${youtubeTrends.length}`);
      totalTrends += youtubeTrends.length;
      
      if (youtubeTrends.length > 0) {
        const newTrends = await filterExistingTrends(supabase, youtubeTrends);
        
        console.log(`[YouTube] Storing ${newTrends.length} new trends to database...`);
        
        for (const trend of newTrends) {
          const { error } = await supabase.from('trend_raw_data').insert({
            source: 'rapidapi_youtube',
            raw_payload: trend,
            processed: false,
          });
          if (!error) {
            totalStored++;
          } else {
            console.error(`[YouTube] Failed to store trend:`, error);
          }
        }
        
        results.push({ platform: 'youtube', source: 'search+trending', found: youtubeTrends.length, stored: newTrends.length });
        await updateScraperStatus(supabase, 'rapidapi_youtube', true);
        console.log(`[YouTube] ✓ Success - Found: ${youtubeTrends.length}, Stored: ${newTrends.length}`);
      } else {
        results.push({ platform: 'youtube', source: 'search+trending', found: 0, stored: 0 });
        await updateScraperStatus(supabase, 'rapidapi_youtube', false, 'No trends found');
        console.log(`[YouTube] ✗ No trends found`);
      }
    } else {
      console.log('[YouTube] Skipping - credentials missing or platform not requested');
    }

    const duration = Date.now() - startTime;
    
    console.log('');
    console.log('========================================');
    console.log('[Scraper Worker] ========== SCRAPING COMPLETE ==========');
    console.log(`[Summary] Duration: ${duration}ms`);
    console.log(`[Summary] Total Found: ${totalTrends}`);
    console.log(`[Summary] Total Stored: ${totalStored}`);
    console.log(`[Summary] Results:`, JSON.stringify(results, null, 2));
    console.log('========================================');

    return new Response(
      JSON.stringify({
        success: totalStored > 0 || totalTrends > 0,
        totalFound: totalTrends,
        totalStored,
        duration,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('========================================');
    console.error('[Scraper Worker] ========== FATAL ERROR ==========');
    console.error('[Error] Message:', error.message);
    console.error('[Error] Stack:', error.stack);
    console.error('========================================');
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
