// Supabase Edge Function: clip-generation
// Processes long-form video into short clips based on selected trends
// Analyzes trend examples and extracts pacing, timing, and style

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
}

interface ClipSpec {
  start_time: number;
  end_time: number;
  duration: number;
  caption: string;
  hashtags: string[];
  platform_id: string;
}

serve(async (req) => {
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

    // Validate video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*, users(id)')
      .eq('id', video_id)
      .single();

    if (videoError || !video || (video as any).user_id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Video not found or unauthorized' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get selected trends
    const { data: trends, error: trendsError } = await supabase
      .from('trends')
      .select('*, platforms(id, name)')
      .in('id', selected_trend_ids);

    if (trendsError) {
      throw new Error(`Failed to fetch trends: ${trendsError.message}`);
    }

    console.log(`[ClipGen] Analyzing ${trends?.length || 0} trends`);

    // Analyze trends to extract patterns
    const trendAnalysis = analyzeTrends(trends || []);

    // Get user's platforms
    const { data: userPlatforms, error: platformsError } = await supabase
      .from('user_platforms')
      .select('platform_id, platforms(id, name)')
      .eq('user_id', user_id);

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    // Generate clip specifications
    const clipSpecs = generateClipSpecs(
      trendAnalysis,
      userPlatforms || [],
      video as any
    );

    console.log(`[ClipGen] Generated ${clipSpecs.length} clip specs`);

    // Process video and create clips
    const createdClips = await processVideoAndCreateClips(
      video_id,
      clipSpecs,
      video as any,
      supabase
    );

    console.log(`[ClipGen] Created ${createdClips.length} clips`);

    return new Response(
      JSON.stringify({
        success: true,
        clips: createdClips,
        count: createdClips.length,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ClipGen] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeTrends(trends: any[]): TrendAnalysis {
  // Analyze trends to extract common patterns
  const durations: number[] = [];
  let totalHookTiming = 0;
  let fastCount = 0;
  let mediumCount = 0;
  let slowCount = 0;

  trends.forEach((trend) => {
    // Estimate duration from engagement metrics
    const engagement = trend.engagement || '';
    const viewsMatch = engagement.match(/(\d+\.?\d*)[MK]?/);
    if (viewsMatch) {
      // Higher views = shorter clips typically
      const views = parseFloat(viewsMatch[1]);
      const multiplier = engagement.includes('M') ? 1000000 : engagement.includes('K') ? 1000 : 1;
      const estimatedDuration = Math.max(15, Math.min(60, 90 - (views * multiplier) / 100000));
      durations.push(estimatedDuration);
    } else {
      durations.push(30); // Default
    }

    // Analyze pacing from description
    const desc = (trend.description || '').toLowerCase();
    if (desc.includes('fast') || desc.includes('quick')) {
      fastCount++;
    } else if (desc.includes('slow') || desc.includes('detailed')) {
      slowCount++;
    } else {
      mediumCount++;
    }
  });

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 30;

  const pacing = fastCount > mediumCount && fastCount > slowCount
    ? 'fast'
    : slowCount > mediumCount
    ? 'slow'
    : 'medium';

  return {
    avg_duration: avgDuration,
    hook_timing: 3, // First 3 seconds typically
    pacing,
    caption_style: 'engaging',
  };
}

function generateClipSpecs(
  analysis: TrendAnalysis,
  userPlatforms: any[],
  video: any
): ClipSpec[] {
  const specs: ClipSpec[] = [];
  const videoDuration = video.duration_seconds || 300; // Default 5 min

  // Generate 2-5 clips per platform
  userPlatforms.forEach((up) => {
    const platform = (up.platforms as any);
    if (!platform) return;

    const clipsPerPlatform = Math.min(3, Math.floor(videoDuration / (analysis.avg_duration * 2)));

    for (let i = 0; i < clipsPerPlatform; i++) {
      const startTime = (i * (videoDuration / clipsPerPlatform)) + (analysis.hook_timing * i);
      const duration = analysis.avg_duration + (Math.random() * 10 - 5); // Add variation
      const endTime = Math.min(startTime + duration, videoDuration);

      specs.push({
        start_time: Math.round(startTime),
        end_time: Math.round(endTime),
        duration: Math.round(duration),
        caption: generateCaption(platform.name, i),
        hashtags: generateHashtags(platform.name),
        platform_id: platform.id,
      });
    }
  });

  return specs;
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

  // For MVP, we'll create clip records with metadata
  // Actual video processing would happen via:
  // 1. External FFmpeg service
  // 2. Cloudinary/Video processing API
  // 3. Background job queue

  // For now, create database records
  // In production, this would:
  // 1. Download video from storage
  // 2. Process with FFmpeg to create clips
  // 3. Upload clips to storage
  // 4. Create database records with storage paths

  for (const spec of clipSpecs) {
    // Generate storage path for clip
    const clipStoragePath = `clips/${videoId}/${spec.platform_id}_${Date.now()}_${spec.start_time}.mp4`;

    const { data: clip, error } = await supabase
      .from('generated_clips')
      .insert({
        video_id: videoId,
        platform_id: spec.platform_id,
        duration_seconds: spec.duration,
        caption: spec.caption,
        hashtags: spec.hashtags,
        storage_path: clipStoragePath,
        start_time_seconds: spec.start_time,
        end_time_seconds: spec.end_time,
      })
      .select()
      .single();

    if (error) {
      console.error(`[ClipGen] Failed to create clip:`, error);
      continue;
    }

    createdClips.push(clip);

    // TODO: In production, trigger actual video processing job here
    // await triggerVideoProcessingJob(video.storage_path, clip.id, spec);
  }

  return createdClips;
}
