// /api/auth/buffer/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { bufferService } from '../../../services/bufferService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }
  try {
    // Exchange code for access token and fetch Buffer profiles
    const { accessToken, refreshToken, profiles } = await bufferService.exchangeCodeForToken(String(code));
    // Let user select a profile (for MVP, pick first)
    const profile = profiles[0];
    // Save to DB (bufferService handles encryption)
    await bufferService.saveConnectedAccount({
      userId: state as string, // In production, use session or JWT
      accessToken,
      refreshToken,
      profileId: profile.id,
      profileName: profile.formatted_username || profile.service_username,
    });
    res.redirect('/settings/connected-platforms?buffer=connected');
  } catch (e) {
    res.status(500).json({ error: 'Buffer OAuth failed', details: (e as Error).message });
  }
}
