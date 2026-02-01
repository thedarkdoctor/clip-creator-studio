// supabase/functions/buffer-publish-worker/index.ts
/**
 * Buffer Publish Worker
 * Runs every 5 minutes to publish scheduled posts to Buffer
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Helper: Send to Zapier for Buffer publishing
async function sendToZapierForPublishing({
  customer_id,
  buffer_access_token,
  buffer_profile_id,
  video_url,
  caption,
  scheduled_time,
}: {
  customer_id: string;
  buffer_access_token: string;
  buffer_profile_id: string;
  video_url: string;
  caption: string;
  scheduled_time: string;
}) {
  const BUFFER_UPDATE_URL = process.env.BUFFER_UPDATE_URL || 'https://api.bufferapp.com/1/updates/create.json';
  const resp = await fetch(`${BUFFER_UPDATE_URL}?access_token=${encodeURIComponent(buffer_access_token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_ids: [buffer_profile_id],
      text: caption,
      media: { video: video_url },
      scheduled_at: scheduled_time || undefined,
      shorten: false,
    }),
  });
  if (!resp.ok) {
    const error = await resp.text();
    throw new Error('Failed to schedule Buffer post: ' + error);
  }
  return true;
}

export async function handler(req: any) {
  console.log('[BufferWorker] Starting publish cycle...');

  try {
    // 1. Query pending posts that are due now
    const { data: pendingPosts, error: queryError } = await supabase
      .from('scheduled_posts')
      .select('*, videos(*), users(buffer_profile_id, buffer_access_token)')
      .eq('buffer_status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (queryError || !pendingPosts) {
      console.error('[BufferWorker] Query failed:', queryError);
      return { statusCode: 500, error: queryError?.message };
    }

    console.log(`[BufferWorker] Found ${pendingPosts.length} posts to publish`);

    let published = 0;
    let failed = 0;

    // 2. For each pending post, attempt to publish
    for (const post of pendingPosts) {
      try {
        // Get video and user details
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', post.video_id)
          .single();

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, buffer_profile_id, buffer_access_token')
          .eq('id', post.user_id)
          .single();

        if (videoError || !video || userError || !user) {
          throw new Error('Failed to fetch video or user data');
        }

        // Send to Zapier/Buffer
        await sendToZapierForPublishing({
          customer_id: user.id,
          buffer_access_token: user.buffer_access_token,
          buffer_profile_id: user.buffer_profile_id,
          video_url: video.video_url || '',
          caption: video.caption || '',
          scheduled_time: post.scheduled_for,
        });

        // Mark as sent
        await supabase
          .from('scheduled_posts')
          .update({ buffer_status: 'sent' })
          .eq('id', post.id);

        published++;
        console.log(`[BufferWorker] Published post ${post.id}`);
      } catch (error: any) {
        // Mark as failed
        await supabase
          .from('scheduled_posts')
          .update({ buffer_status: 'failed' })
          .eq('id', post.id);

        failed++;
        console.error(`[BufferWorker] Failed to publish post ${post.id}:`, error.message);
      }
    }

    console.log(`[BufferWorker] Complete: ${published} published, ${failed} failed`);
    return { statusCode: 200, published, failed };
  } catch (error: any) {
    console.error('[BufferWorker] Worker error:', error);
    return { statusCode: 500, error: error.message };
  }
}
