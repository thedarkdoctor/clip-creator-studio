// /api/auth/buffer/connect.ts
// DEPRECATED: Buffer OAuth is no longer used
// All publishing is handled via Zapier webhook

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'Buffer OAuth is no longer supported',
    message: 'Please use Zapier webhook integration instead',
    details: 'All video publishing is now handled directly through Zapier webhooks',
  });
}
