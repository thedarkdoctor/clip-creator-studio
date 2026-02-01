// /services/bufferService.ts

// Use require for Node.js modules to avoid type errors in some build setups
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { Buffer } = require('buffer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUFFER_CLIENT_ID = process.env.BUFFER_CLIENT_ID;
const BUFFER_CLIENT_SECRET = process.env.BUFFER_CLIENT_SECRET;
const BUFFER_REDIRECT_URI = process.env.BUFFER_REDIRECT_URI;
const ENCRYPTION_KEY = process.env.BUFFER_ENCRYPTION_KEY;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const bufferService = {
  async exchangeCodeForToken(code: string) {
    const resp = await fetch('https://api.bufferapp.com/1/oauth2/token.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: BUFFER_CLIENT_ID,
        client_secret: BUFFER_CLIENT_SECRET,
        redirect_uri: BUFFER_REDIRECT_URI,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) throw new Error('Failed to exchange code');
    const data = await resp.json();
    // Get Buffer profiles
    const profilesResp = await fetch('https://api.bufferapp.com/1/profiles.json?access_token=' + data.access_token);
    const profiles = await profilesResp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      profiles,
    };
  },

  async saveConnectedAccount({ userId, accessToken, refreshToken, profileId, profileName }: {
    userId: string,
    accessToken: string,
    refreshToken?: string,
    profileId: string,
    profileName: string,
  }) {
    const encryptedToken = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;
    const { error } = await supabase.from('connected_social_accounts').upsert({
      user_id: userId,
      provider: 'buffer',
      buffer_access_token: encryptedToken,
      buffer_refresh_token: encryptedRefresh,
      buffer_profile_id: profileId,
      buffer_profile_name: profileName,
    }, { onConflict: ['user_id', 'provider'] });
    if (error) throw error;
  },

  async getConnectedAccount(userId: string) {
    const { data, error } = await supabase.from('connected_social_accounts').select('*').eq('user_id', userId).eq('provider', 'buffer').single();
    if (error || !data) throw error || new Error('Not found');
    return {
      ...data,
      buffer_access_token: decrypt(data.buffer_access_token),
      buffer_refresh_token: data.buffer_refresh_token ? decrypt(data.buffer_refresh_token) : null,
    };
  },
};
