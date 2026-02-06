// src/services/lynkscopeAuthService.ts
/**
 * Lynkscope Authentication Service
 * Client-side utilities for Lynkscope SSO integration
 */

import { supabase } from '@/integrations/supabase/client';

interface LynkscopeSSORequest {
  user_id: string;
  email: string;
  business_name: string;
  niche: string;
  timestamp?: number;
}

interface LynkscopeSSOResponse {
  success: boolean;
  session_token: string;
  user: {
    id: string;
    email: string;
    business_name: string | null;
    niche: string | null;
  };
  redirect_url: string;
}

interface ProfileUpdateRequest {
  user_id: string;
  business_name?: string;
  niche?: string;
}

/**
 * Generate HMAC-SHA256 signature for request payload
 * Note: This is for internal/testing use. In production, Lynkscope generates the signature.
 */
export async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Initiate SSO authentication from Lynkscope
 * This would be called by Lynkscope when launching Cliplyst
 */
export async function initiateLynkscopeSSO(
  request: LynkscopeSSORequest,
  signature: string
): Promise<LynkscopeSSOResponse> {
  const { data, error } = await supabase.functions.invoke('lynkscope-sso', {
    body: request,
    headers: {
      'x-lynkscope-signature': signature
    }
  });

  if (error) {
    throw new Error(`SSO failed: ${error.message}`);
  }

  return data as LynkscopeSSOResponse;
}

/**
 * Update user profile from Lynkscope
 */
export async function updateProfileFromLynkscope(
  request: ProfileUpdateRequest,
  signature: string
): Promise<{ success: boolean; user: { id: string; business_name: string | null; niche: string | null } }> {
  const { data, error } = await supabase.functions.invoke('lynkscope-update-profile', {
    body: request,
    headers: {
      'x-lynkscope-signature': signature
    }
  });

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }

  return data;
}

/**
 * Build the SSO redirect URL for Lynkscope to use
 */
export function buildSSORedirectURL(
  baseUrl: string,
  token: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('lynkscope_token', token);
  return url.toString();
}

/**
 * Validate that the current session originated from Lynkscope
 */
export function isLynkscopeOrigin(): boolean {
  const token = localStorage.getItem('cliplyst_lynkscope_token');
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.source === 'lynkscope';
  } catch {
    return false;
  }
}

/**
 * Get user ID from Lynkscope session
 */
export function getLynkscopeUserId(): string | null {
  const token = localStorage.getItem('cliplyst_lynkscope_token');
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Check if Lynkscope session is expired
 */
export function isLynkscopeSessionExpired(): boolean {
  const token = localStorage.getItem('cliplyst_lynkscope_token');
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}
