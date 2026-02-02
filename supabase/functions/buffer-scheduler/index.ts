// Supabase Edge Function: buffer-scheduler
// Schedules posts for publishing via Zapier webhook
// Handles posting frequency and UTC-based scheduling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRequest {
  user_id: string;
  clip_ids: string[];
  caption?: string;
  hashtags?: string[];
  platforms: string[];
  posting_frequency: 'once_week' | 'twice_week' | 'daily' | 'every_other_day' | 'custom';
  custom_schedule?: string[]; // ISO date strings
  start_date?: string; // ISO date string, defaults to tomorrow
}

interface ScheduledPost {
  clip_id: string;
  scheduled_at: string;
  status: 'pending' | 'published' | 'failed' | 'scheduled';
  error_message?: string;
}

interface BufferPost extends ScheduledPost {
  buffer_post_id?: string | null;
}

const BUFFER_ACCESS_TOKEN = Deno.env.get('BUFFER_ACCESS_TOKEN') || '';
const BUFFER_API_URL = 'https://api.bufferapp.com/1';

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

    const request: ScheduleRequest = await req.json();

    console.log('[Buffer] Scheduling request', {
      user_id: request.user_id,
      clip_count: request.clip_ids.length,
      frequency: request.posting_frequency,
    });

    // Validate clips belong to user
    const { data: clips, error: clipsError } = await supabase
      .from('generated_clips')
      .select(`
        *,
        videos!inner(user_id),
        platforms(name)
      `)
      .in('id', request.clip_ids);

    if (clipsError || !clips || clips.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Clips not found or unauthorized' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Verify all clips belong to user
    const unauthorizedClips = clips.filter(
      (clip: any) => clip.videos.user_id !== request.user_id
    );
    if (unauthorizedClips.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Some clips do not belong to user' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate schedule dates
    const scheduleDates = calculateScheduleDates(
      request.posting_frequency,
      request.start_date,
      request.custom_schedule,
      request.clip_ids.length
    );

    console.log(`[Buffer] Calculated ${scheduleDates.length} schedule dates`);

    // Schedule posts
    const scheduledPosts: BufferPost[] = [];

    for (let i = 0; i < clips.length && i < scheduleDates.length; i++) {
      const clip = clips[i] as any;
      const scheduledAt = scheduleDates[i];

      try {
        // Create Buffer post
        const bufferPostId = await createBufferPost(
          clip,
          request.platforms,
          request.caption || clip.caption || '',
          request.hashtags || clip.hashtags || [],
          scheduledAt
        );

        // Store in database
        const { data: bufferPost, error: dbError } = await supabase
          .from('buffer_posts')
          .insert({
            user_id: request.user_id,
            clip_id: clip.id,
            buffer_post_id: bufferPostId,
            platform: (clip.platforms as any)?.name || request.platforms[0],
            caption: request.caption || clip.caption || '',
            hashtags: request.hashtags || clip.hashtags || [],
            scheduled_at: scheduledAt,
            status: bufferPostId ? 'scheduled' : 'pending',
          })
          .select()
          .single();

        if (dbError) {
          console.error(`[Buffer] Failed to save post for clip ${clip.id}:`, dbError);
          scheduledPosts.push({
            clip_id: clip.id,
            scheduled_at: scheduledAt,
            status: 'failed',
            error_message: dbError.message,
          });
        } else {
          scheduledPosts.push({
            clip_id: clip.id,
            buffer_post_id: bufferPostId,
            scheduled_at: scheduledAt,
            status: bufferPostId ? 'scheduled' : 'pending',
          });
          console.log(`[Buffer] Scheduled | platform=${(clip.platforms as any)?.name} | date=${scheduledAt}`);
        }
      } catch (error: any) {
        console.error(`[Buffer] Error scheduling clip ${clip.id}:`, error);
        scheduledPosts.push({
          clip_id: clip.id,
          scheduled_at: scheduledAt,
          status: 'failed',
          error_message: error.message,
        });
      }
    }

    const successCount = scheduledPosts.filter((p) => p.status === 'scheduled').length;
    const failedCount = scheduledPosts.filter((p) => p.status === 'failed').length;

    console.log(`[Buffer] Scheduled ${successCount} posts, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: scheduledPosts,
        summary: {
          total: scheduledPosts.length,
          scheduled: successCount,
          failed: failedCount,
        },
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Buffer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateScheduleDates(
  frequency: string,
  startDate?: string,
  customSchedule?: string[],
  clipCount: number = 1
): string[] {
  if (frequency === 'custom' && customSchedule) {
    return customSchedule.slice(0, clipCount);
  }

  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

  // Set to 9 AM UTC
  start.setUTCHours(9, 0, 0, 0);

  const dates: string[] = [];
  let currentDate = new Date(start);

  for (let i = 0; i < clipCount; i++) {
    dates.push(currentDate.toISOString());

    switch (frequency) {
      case 'once_week':
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
        break;
      case 'twice_week':
        currentDate.setUTCDate(currentDate.getUTCDate() + 3); // ~3.5 days
        break;
      case 'daily':
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        break;
      case 'every_other_day':
        currentDate.setUTCDate(currentDate.getUTCDate() + 2);
        break;
      default:
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  return dates;
}

async function createBufferPost(
  clip: any,
  platforms: string[],
  caption: string,
  hashtags: string[],
  scheduledAt: string
): Promise<string | null> {
  if (!BUFFER_ACCESS_TOKEN) {
    console.warn('[Buffer] No Buffer access token configured, skipping API call');
    return null;
  }

  try {
    // Format caption with hashtags
    const hashtagString = hashtags.map((h) => `#${h.replace('#', '')}`).join(' ');
    const fullText = `${caption}\n\n${hashtagString}`.trim();

    // Buffer API expects different format for different platforms
    // For MVP, we'll use a generic approach
    const profileId = await getBufferProfileId(platforms[0]);

    if (!profileId) {
      throw new Error('No Buffer profile found for platform');
    }

    const response = await fetch(`${BUFFER_API_URL}/updates/create.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BUFFER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_ids: [profileId],
        text: fullText,
        scheduled_at: scheduledAt,
        media: {
          link: clip.storage_path || '', // Would be actual media URL
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Buffer API error: ${errorText}`);
    }

    const data = await response.json();
    return data.id || null;
  } catch (error: any) {
    console.error('[Buffer] Failed to create post:', error);
    // Don't throw - return null so we can still save to DB
    return null;
  }
}

async function getBufferProfileId(platform: string): Promise<string | null> {
  if (!BUFFER_ACCESS_TOKEN) return null;

  try {
    const response = await fetch(`${BUFFER_API_URL}/profiles.json`, {
      headers: {
        'Authorization': `Bearer ${BUFFER_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const profiles = Array.isArray(data) ? data : data.profiles || [];

    // Find profile matching platform
    const platformMap: Record<string, string[]> = {
      'TikTok': ['tiktok'],
      'Instagram Reels': ['instagram'],
      'YouTube Shorts': ['youtube'],
      'Facebook': ['facebook'],
      'Twitter/X': ['twitter'],
    };

    const searchTerms = platformMap[platform] || [platform.toLowerCase()];

    for (const profile of profiles) {
      const service = (profile.service || '').toLowerCase();
      if (searchTerms.some((term) => service.includes(term))) {
        return profile.id;
      }
    }

    return profiles[0]?.id || null;
  } catch (error) {
    console.error('[Buffer] Failed to get profiles:', error);
    return null;
  }
}
