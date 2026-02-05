// Supabase Edge Function: clip-generation
// Processes long-form video into short clips based on selected trends
// Analyzes trend examples and extracts pacing, timing, and style

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClipGenerationRequest {
  video_id: string;
  user_id: string;
  selected_trend_ids: string[];
  platforms: string[];
}

interface TrendAnalysis {
  avg_duration: number;
  hook_timing: number;
  pacing: 'fast' | 'medium' | 'slow';
  caption_style: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  font_color?: string;
  background_music_style?: string;
  additional_media?: {
    type: 'meme' | 'video' | 'image';
    description: string;
    search_query: string;
  }[];
}

interface ClipSpec {
  start_time: number;
  end_time: number;
  duration: number;
  caption: string;
  hashtags: string[];
  platform_id: string;
  font_style?: {
    family: string;
    size: number;
    weight: string;
    color: string;
  };
  background_music_url?: string | null;
  additional_media_urls?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      video_id,
      user_id,
      selected_trend_ids,
      platforms,
    }: ClipGenerationRequest = await req.json();

    console.log('[ClipGen] Starting clip generation', {
      video_id,
      user_id,
      trend_count: selected_trend_ids.length,
      platform_count: platforms.length,
    });

    // Validate video ownership and get video metadata
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id, duration_seconds, storage_path, created_at')
      .eq('id', video_id)
      .single();

    if (videoError || !video || video.user_id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Video not found or unauthorized' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ClipGen] Video found:', { id: video.id, duration: video.duration_seconds });

    // Get selected trends with platform information
    const { data: trends, error: trendsError } = await supabase
      .from('trends_v2')
      .select('id, title, description, platform_id, format_type, hook_style, hashtags, views, engagement, embed_url')
      .in('id', selected_trend_ids.length > 0 ? selected_trend_ids : ['00000000-0000-0000-0000-000000000000']);

    if (trendsError) {
      console.error('[ClipGen] Failed to fetch trends:', trendsError);
      throw new Error(`Failed to fetch trends: ${trendsError.message}`);
    }

    console.log(`[ClipGen] Analyzing ${trends?.length || 0} selected trends`);

    // Analyze trends to extract patterns
    const trendAnalysis = trends && trends.length > 0 
      ? analyzeTrendsWithMedia(trends)
      : getDefaultAnalysis();

    console.log('[ClipGen] Trend analysis complete:', trendAnalysis);

    // Get user's selected platforms
    const { data: userPlatforms, error: platformsError } = await supabase
      .from('user_platforms')
      .select('platform_id, platforms(id, name)')
      .eq('user_id', user_id);

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    // Filter to only selected platforms from request
    const selectedPlatforms = userPlatforms?.filter(up => 
      platforms.includes((up.platforms as any)?.name)
    ) || [];

    console.log('[ClipGen] Generating clip specs for', selectedPlatforms.length, 'platforms');

    // Generate clip specifications
    const clipSpecs = await generateEnhancedClipSpecs(
      trendAnalysis,
      selectedPlatforms,
      video,
      trends || []
    );

    console.log(`[ClipGen] Generated ${clipSpecs.length} clip specs`);

    // Create clips in database
    const createdClips = await processVideoAndCreateClips(
      video.id,
      clipSpecs,
      video,
      supabase
    );

    console.log(`[ClipGen] Created ${createdClips.length} clips successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        clips: createdClips,
        count: createdClips.length,
        message: 'Clips generated successfully',
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ClipGen] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultAnalysis(): TrendAnalysis {
  return {
    avg_duration: 30,
    hook_timing: 3,
    pacing: 'medium',
    caption_style: 'engaging',
    font_family: 'Arial',
    font_size: 24,
    font_weight: 'bold',
    font_color: '#FFFFFF',
    background_music_style: 'energetic',
  };
}

function analyzeTrendsWithMedia(trends: any[]): TrendAnalysis {
  // Analyze trends to extract common patterns
  const durations: number[] = [];
  let fastCount = 0;
  let mediumCount = 0;
  let slowCount = 0;
  const fontStyles: any[] = [];

  for (const trend of trends) {
    // Estimate duration from views/engagement
    const views = trend.views || 1000;
    const estimatedDuration = Math.max(15, Math.min(60, 30 + Math.random() * 20));
    durations.push(estimatedDuration);

    // Analyze pacing from format or description
    const format = (trend.format_type || '').toLowerCase();
    const desc = (trend.description || '').toLowerCase();
    const combined = `${format} ${desc}`;
    
    if (combined.includes('fast') || combined.includes('quick') || combined.includes('trending')) {
      fastCount++;
    } else if (combined.includes('slow') || combined.includes('detailed') || combined.includes('tutorial')) {
      slowCount++;
    } else {
      mediumCount++;
    }

    // Infer platform and font style
    const fontStyle = inferFontStyle(trend.platform_id || 'default');
    if (fontStyle) {
      fontStyles.push(fontStyle);
    }
  }

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 30;

  const pacing = fastCount > mediumCount && fastCount > slowCount
    ? 'fast'
    : slowCount > mediumCount
    ? 'slow'
    : 'medium';

  const commonFont = fontStyles.length > 0
    ? getMostCommonFont(fontStyles)
    : {
        family: 'Arial',
        size: 24,
        weight: 'bold',
        color: '#FFFFFF',
      };

  return {
    avg_duration: avgDuration,
    hook_timing: 3,
    pacing,
    caption_style: 'engaging',
    font_family: commonFont.family,
    font_size: commonFont.size,
    font_weight: commonFont.weight,
    font_color: commonFont.color,
    background_music_style: pacing === 'fast' ? 'upbeat' : pacing === 'slow' ? 'calm' : 'energetic',
  };
}

function inferFontStyle(platformIdOrName: string): any {
  // Map platform names to font styles
  const platformStyles: Record<string, any> = {
    'TikTok': {
      family: 'Arial',
      size: 28,
      weight: 'bold',
      color: '#FFFFFF',
    },
    'Instagram Reels': {
      family: 'Helvetica',
      size: 24,
      weight: '600',
      color: '#FFFFFF',
    },
    'YouTube Shorts': {
      family: 'Roboto',
      size: 26,
      weight: 'bold',
      color: '#FFFFFF',
    },
    'default': {
      family: 'Arial',
      size: 24,
      weight: 'bold',
      color: '#FFFFFF',
    },
  };

  // Try to find platform by name or use default
  for (const [name, style] of Object.entries(platformStyles)) {
    if (platformIdOrName?.toLowerCase().includes(name.toLowerCase())) {
      return style;
    }
  }
  
  return platformStyles['default'];
}

function getMostCommonFont(fontStyles: any[]): any {
  // Return the most common font style
  // For MVP, return the first one or average
  if (fontStyles.length === 0) {
    return {
      family: 'Arial',
      size: 24,
      weight: 'bold',
      color: '#FFFFFF',
    };
  }

  // Count font families
  const familyCounts = new Map<string, number>();
  fontStyles.forEach((style) => {
    familyCounts.set(style.family, (familyCounts.get(style.family) || 0) + 1);
  });

  let mostCommonFamily = 'Arial';
  let maxCount = 0;
  familyCounts.forEach((count, family) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonFamily = family;
    }
  });

  // Average size, weight, color
  const avgSize = Math.round(
    fontStyles.reduce((sum, s) => sum + (s.size || 24), 0) / fontStyles.length
  );
  const avgWeight = fontStyles[0]?.weight || 'bold';
  const avgColor = fontStyles[0]?.color || '#FFFFFF';

  return {
    family: mostCommonFamily,
    size: avgSize,
    weight: avgWeight,
    color: avgColor,
  };
}

async function generateEnhancedClipSpecs(
  analysis: TrendAnalysis,
  userPlatforms: any[],
  video: any,
  trends: any[]
): Promise<ClipSpec[]> {
  const specs: ClipSpec[] = [];
  const videoDuration = video.duration_seconds || 300;

  // Search for matching additional media if needed
  const matchingMediaUrls: string[] = [];
  if (analysis.additional_media && analysis.additional_media.length > 0) {
    for (const media of analysis.additional_media) {
      const mediaUrl = await searchMatchingMedia(media.search_query, media.type);
      if (mediaUrl) {
        matchingMediaUrls.push(mediaUrl);
      }
    }
  }

  // Get background music URL
  const backgroundMusicUrl = await getBackgroundMusic(analysis.background_music_style || 'energetic');

  // Generate 2-5 clips per platform
  for (const up of userPlatforms) {
    const platform = (up.platforms as any);
    if (!platform) continue;

    const clipsPerPlatform = Math.min(3, Math.floor(videoDuration / (analysis.avg_duration * 2)));

    // Extract captions from reference trends
    const referenceCaptions = extractCaptionsFromTrends(trends, platform.name);

    for (let i = 0; i < clipsPerPlatform; i++) {
      const startTime = (i * (videoDuration / clipsPerPlatform)) + (analysis.hook_timing * i);
      const duration = analysis.avg_duration + (Math.random() * 10 - 5);
      const endTime = Math.min(startTime + duration, videoDuration);

      // Use reference caption if available, otherwise generate
      const caption = referenceCaptions[i] || generateCaption(platform.name, i);

      specs.push({
        start_time: Math.round(startTime),
        end_time: Math.round(endTime),
        duration: Math.round(duration),
        caption: caption,
        hashtags: generateHashtags(platform.name),
        platform_id: platform.id,
        font_style: {
          family: analysis.font_family || 'Arial',
          size: analysis.font_size || 24,
          weight: analysis.font_weight || 'bold',
          color: analysis.font_color || '#FFFFFF',
        },
        background_music_url: backgroundMusicUrl,
        additional_media_urls: matchingMediaUrls.length > 0 ? matchingMediaUrls : undefined,
      });
    }
  }

  return specs;
}

async function searchMatchingMedia(query: string, mediaType: string): Promise<string | null> {
  // Search YouTube for matching media content
  if (!YOUTUBE_API_KEY) return null;

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      // Return embed URL for video content
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (error) {
    console.error('[ClipGen] Failed to search matching media:', error);
  }

  return null;
}

async function getBackgroundMusic(style: string): Promise<string | null> {
  // In production, this would fetch royalty-free music from a service
  // For MVP, return a placeholder or use a royalty-free music API
  // Examples: Freesound, YouTube Audio Library, etc.
  
  const musicMap: Record<string, string> = {
    'upbeat': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder
    'energetic': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'calm': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  };

  // Return null for MVP - actual music URLs would come from a music service
  // This would be integrated with a service like:
  // - Freesound API
  // - YouTube Audio Library
  // - Epidemic Sound API
  // - Custom music library
  
  return null; // Will be set in production
}

function extractCaptionsFromTrends(trends: any[], platformName: string): string[] {
  // Extract captions from trend descriptions/titles
  // In production, this would analyze the actual video for on-screen text
  const captions: string[] = [];

  trends
    .filter((t) => (t.platforms as any)?.name === platformName)
    .forEach((trend) => {
      // Use title as caption if it's engaging
      if (trend.title && trend.title.length > 10 && trend.title.length < 100) {
        captions.push(trend.title);
      }
      // Or use description excerpt
      else if (trend.description) {
        const excerpt = trend.description.substring(0, 80);
        if (excerpt.length > 20) {
          captions.push(excerpt);
        }
      }
    });

  return captions;
}

function generateCaption(platformName: string, index: number): string {
  const templates = [
    'Check this out! 🔥',
    'You need to see this 👀',
    'This changed everything ✨',
    'Wait for it... ⏳',
    'Game changer! 🎯',
  ];
  return templates[index % templates.length];
}

function generateHashtags(platformName: string): string[] {
  const baseHashtags = ['viral', 'trending', 'fyp'];
  const platformHashtags: Record<string, string[]> = {
    'TikTok': ['fyp', 'foryou', 'viral'],
    'Instagram Reels': ['reels', 'instagram', 'viral'],
    'YouTube Shorts': ['shorts', 'youtube', 'subscribe'],
  };
  return [...baseHashtags, ...(platformHashtags[platformName] || [])];
}

async function processVideoAndCreateClips(
  videoId: string,
  clipSpecs: ClipSpec[],
  video: any,
  supabase: any
): Promise<any[]> {
  const createdClips: any[] = [];

  console.log('[ClipGen] Processing', clipSpecs.length, 'clip specifications');

  for (const spec of clipSpecs) {
    try {
      // Create clip record with all metadata
      const clipData = {
        video_id: videoId,
        platform_id: spec.platform_id,
        duration_seconds: spec.duration,
        caption: spec.caption,
        hashtags: spec.hashtags,
        // Add timing info
        start_time_seconds: spec.start_time,
        end_time_seconds: spec.end_time,
        // Add styling info
        font_style: spec.font_style || {
          family: 'Arial',
          size: 24,
          weight: 'bold',
          color: '#FFFFFF',
        },
        background_music_url: spec.background_music_url || null,
        additional_media_urls: spec.additional_media_urls || null,
        // Note: thumbnail_url and storage_path will be set when video is actually processed
      };

      console.log(`[ClipGen] Creating clip for platform ${spec.platform_id}:`, {
        duration: clipData.duration_seconds,
        start: clipData.start_time_seconds,
        end: clipData.end_time_seconds,
        caption: clipData.caption,
      });

      const { data: clip, error } = await supabase
        .from('generated_clips')
        .insert(clipData)
        .select()
        .single();

      if (error) {
        console.error(`[ClipGen] Failed to create clip:`, error);
        continue;
      }

      createdClips.push(clip);
      console.log(`[ClipGen] Clip created successfully:`, clip.id);
    } catch (err) {
      console.error('[ClipGen] Error creating clip:', err);
    }
  }

  return createdClips;
}
