// src/services/postSchedulerService.ts
import { supabase } from '@/integrations/supabase/client';

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

function getIntervalDays(frequency: Frequency): number {
  const intervals: Record<Frequency, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
  };
  return intervals[frequency];
}

/**
 * Schedule videos for posting with smart cadence continuation
 */
export async function scheduleVideos(userId: string, frequency: Frequency, videoIds: string[]) {
  // 1. Check if user has an active schedule
  const { data: existingSchedule, error: scheduleError } = await (supabase as any)
    .from('post_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  const intervalDays = getIntervalDays(frequency);
  let nextPostAt: Date;

  if (!existingSchedule) {
    // New schedule: start from now + interval
    nextPostAt = new Date();
    nextPostAt.setDate(nextPostAt.getDate() + intervalDays);

    // Create schedule
    await (supabase as any).from('post_schedules').insert({
      user_id: userId,
      frequency,
      next_post_at: nextPostAt.toISOString(),
      auto_mode: false,
    });
  } else {
    // Continue from existing schedule (do NOT reset)
    nextPostAt = new Date(existingSchedule.next_post_at);
  }

  // 2. Loop through videoIds and schedule each one
  const scheduledPosts = videoIds.map(videoId => {
    const currentPost = {
      user_id: userId,
      video_id: videoId,
      scheduled_for: nextPostAt.toISOString(),
      buffer_status: 'pending',
    };
    // Increment for next post
    nextPostAt = new Date(nextPostAt);
    nextPostAt.setDate(nextPostAt.getDate() + intervalDays);
    return currentPost;
  });

  // Insert all scheduled posts
  await (supabase as any).from('scheduled_posts').insert(scheduledPosts);

  // 3. Update post_schedules with new next_post_at
  await (supabase as any)
    .from('post_schedules')
    .update({ next_post_at: nextPostAt.toISOString() })
    .eq('user_id', userId);

  return { success: true, count: videoIds.length, nextPostAt };
}

/**
 * Enable auto-scheduling for future videos
 */
export async function enableAutoMode(userId: string, enabled: boolean) {
  const { error } = await (supabase as any)
    .from('post_schedules')
    .update({ auto_mode: enabled })
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
}

/**
 * Get user's schedule info
 */
export async function getScheduleInfo(userId: string) {
  const { data, error } = await (supabase as any)
    .from('post_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Delete schedule and clear pending posts
 */
export async function deleteSchedule(userId: string) {
  await (supabase as any).from('post_schedules').delete().eq('user_id', userId);
  await (supabase as any).from('scheduled_posts').delete().eq('user_id', userId);
  return { success: true };
}
