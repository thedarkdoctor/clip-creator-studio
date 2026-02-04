// supabase/functions/lynkscope-sso/index.ts
// Secure SSO endpoint for Lynkscope → Cliplyst authentication

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lynkscope-signature',
};

interface LynkscopeAuthPayload {
  user_id: string;
  email: string;
  business_name: string;
  niche: string;
  timestamp?: number;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate the x-lynkscope-signature header
 * Uses HMAC-SHA256 signature verification
 */
async function validateSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
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
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return constantTimeCompare(expectedSignature, signature);
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Create a JWT session token for the user
 */
async function createSessionToken(userId: string, email: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    source: 'lynkscope'
  };

  const encoder = new TextEncoder();
  const secret = Deno.env.get('LYNKSCOPE_INTERNAL_KEY') || '';
  
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
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
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the shared secret
    const sharedSecret = Deno.env.get('LYNKSCOPE_INTERNAL_KEY');
    if (!sharedSecret) {
      console.error('LYNKSCOPE_INTERNAL_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and validate the signature
    const signature = req.headers.get('x-lynkscope-signature');
    if (!signature) {
      console.warn('Missing x-lynkscope-signature header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const bodyText = await req.text();
    let payload: LynkscopeAuthPayload;
    
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate signature
    const isValidSignature = await validateSignature(bodyText, signature, sharedSecret);
    if (!isValidSignature) {
      console.warn('Invalid signature received');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!payload.user_id || !payload.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check timestamp if provided (prevent replay attacks - 5 minute window)
    if (payload.timestamp) {
      const now = Date.now();
      const diff = Math.abs(now - payload.timestamp);
      if (diff > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: 'Request expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Supabase with service role for user management
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing SSO for user: ${payload.email}`);

    // Check if user exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user;
    
    if (!existingUser) {
      // Create new user record
      console.log(`Creating new user: ${payload.user_id}`);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: payload.user_id,
          brand_name: payload.business_name || null,
          niche: payload.niche || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = newUser;
    } else {
      // Update existing user with latest data from Lynkscope
      console.log(`Updating existing user: ${payload.user_id}`);
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          brand_name: payload.business_name || existingUser.brand_name,
          niche: payload.niche || existingUser.niche
        })
        .eq('id', payload.user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        // Continue with existing user data
        user = existingUser;
      } else {
        user = updatedUser;
      }
    }

    // Create session token
    const sessionToken = await createSessionToken(payload.user_id, payload.email);

    console.log(`SSO successful for user: ${payload.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        user: {
          id: user.id,
          email: payload.email,
          business_name: user.brand_name,
          niche: user.niche
        },
        redirect_url: '/brand-setup'
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          // Set secure cookie with session token
          'Set-Cookie': `cliplyst_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        } 
      }
    );

  } catch (error) {
    console.error('SSO error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
