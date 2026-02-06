// supabase/functions/lynkscope-update-profile/index.ts
// Endpoint for Lynkscope to sync user profile updates

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lynkscope-signature',
};

interface ProfileUpdatePayload {
  user_id: string;
  business_name?: string;
  niche?: string;
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST/PUT requests
    if (req.method !== 'POST' && req.method !== 'PUT') {
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
    let payload: ProfileUpdatePayload;
    
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
    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
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

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Updating profile for user: ${payload.user_id}`);

    // Build update object
    const updateData: Record<string, string> = {};
    if (payload.business_name !== undefined) {
      updateData.brand_name = payload.business_name;
    }
    if (payload.niche !== undefined) {
      updateData.niche = payload.niche;
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', payload.user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      
      // Check if user doesn't exist
      if (updateError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Profile updated successfully for user: ${payload.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: updatedUser.id,
          business_name: updatedUser.brand_name,
          niche: updatedUser.niche
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
