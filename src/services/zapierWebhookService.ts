// /services/zapierWebhookService.ts
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
  const payload = {
    customer_id,
    buffer_access_token,
    buffer_profile_id,
    video_url,
    caption,
    scheduled_time,
  };
  const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!zapierWebhookUrl) throw new Error('Zapier webhook URL not set');
  const resp = await fetch(zapierWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('Failed to send to Zapier');
  return true;
}
