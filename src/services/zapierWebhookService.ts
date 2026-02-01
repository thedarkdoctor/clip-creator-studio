// /services/zapierWebhookService.ts

// Zapier webhook endpoint for publishing to Buffer
const ZAPIER_WEBHOOK_URL = import.meta.env.VITE_ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/26258261/ul1b4v1/';

/**
 * Sends a post to Buffer using the Zapier webhook.
 * The webhook URL is securely managed via env (VITE_ZAPIER_WEBHOOK_URL).
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
  // Build payload for Zapier webhook
  const payload = {
    customer_id,
    buffer_access_token,
    buffer_profile_id,
    video_url,
    caption,
    scheduled_time: scheduled_time || undefined,
  };
  const resp = await fetch(ZAPIER_WEBHOOK_URL, {
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
