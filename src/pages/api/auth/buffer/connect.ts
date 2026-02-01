// /api/auth/buffer/connect.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BUFFER_CLIENT_ID = process.env.BUFFER_CLIENT_ID;
const BUFFER_REDIRECT_URI = process.env.BUFFER_REDIRECT_URI;
const BUFFER_AUTH_URL = 'https://buffer.com/oauth2/authorize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!BUFFER_CLIENT_ID || !BUFFER_REDIRECT_URI) {
    return res.status(500).json({ error: 'Buffer OAuth not configured' });
  }
  const state = req.query.state || '';
  const url = `${BUFFER_AUTH_URL}?client_id=${BUFFER_CLIENT_ID}&redirect_uri=${encodeURIComponent(BUFFER_REDIRECT_URI)}&response_type=code&state=${state}&scope=manage.social`;
  res.redirect(url);
}
