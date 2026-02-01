// /services/zapierWebhookService.ts

// Buffer API endpoint for scheduling posts
const BUFFER_UPDATE_URL = process.env.BUFFER_UPDATE_URL || 'https://api.bufferapp.com/1/updates/create.json';

/**
 * Schedules a post to Buffer using the Buffer API.
 * The URL is securely managed via env (BUFFER_UPDATE_URL).
 */
export async function sendToZapierForPublishing({
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
  scheduled_time: string | null;
}) {
  // Build Buffer API payload
  const payload = {
    profile_ids: [buffer_profile_id],
    text: caption,
    media: { video: video_url },
    scheduled_at: scheduled_time || undefined,
    shorten: false,
  };
  const resp = await fetch(`${BUFFER_UPDATE_URL}?access_token=${encodeURIComponent(buffer_access_token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const error = await resp.text();
    throw new Error('Failed to schedule Buffer post: ' + error);
  }
  return true;
}
