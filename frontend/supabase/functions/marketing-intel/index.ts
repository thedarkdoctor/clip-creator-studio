// supabase/functions/marketing-intel/index.ts
/**
 * Marketing Intelligence Receiver
 * Accepts analytics insights from Lynkscope and stores them for strategy-aware content generation
 * 
 * Authentication: HMAC-SHA256 signature via x-lynkscope-signature header
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lynkscope-signature',
};

interface MarketingIntelPayload {
  user_id: string;
  business_name: string;
  niche: string;
  total_clicks: number;
  top_platform: string;
  underperforming_platforms: string[];
  platform_click_breakdown: {
    youtube: number;
    tiktok: number;
    instagram: number;
    other: number;
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate HMAC-SHA256 signature
 */
async function validateSignature(body: string, signature: string, secret: string): Promise<boolean> {
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
      encoder.encode(body)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return timingSafeEqual(expectedSignature, signature);
  } catch (error) {
    console.error('[Signature Validation Error]', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Marketing Intel] Incoming request');

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shared secret
    const sharedSecret = Deno.env.get('LYNKSCOPE_INTERNAL_KEY');
    if (!sharedSecret) {
      console.error('[Marketing Intel] LYNKSCOPE_INTERNAL_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate signature header
    const signature = req.headers.get('x-lynkscope-signature');
    if (!signature) {
      console.warn('[Marketing Intel] Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Missing x-lynkscope-signature header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const bodyText = await req.text();
    let payload: MarketingIntelPayload;
    
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate signature
    const isValidSignature = await validateSignature(bodyText, signature, sharedSecret);
    if (!isValidSignature) {
      console.warn('[Marketing Intel] Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Marketing Intel] Signature validated for user:', payload.user_id);

    // Validate required fields
    const requiredFields = ['user_id', 'business_name', 'niche'];
    const missingFields = requiredFields.filter(field => !payload[field as keyof MarketingIntelPayload]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: `Missing required fields: ${missingFields.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert marketing intelligence
    const { data, error } = await supabase
      .from('marketing_intelligence')
      .upsert({
        user_id: payload.user_id,
        business_name: payload.business_name,
        niche: payload.niche.toLowerCase(),
        total_clicks: payload.total_clicks || 0,
        top_platform: payload.top_platform?.toLowerCase() || null,
        underperforming_platforms: (payload.underperforming_platforms || []).map(p => p.toLowerCase()),
        platform_click_breakdown: payload.platform_click_breakdown || { youtube: 0, tiktok: 0, instagram: 0, other: 0 },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Marketing Intel] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: 'Failed to store intelligence' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Marketing Intel] Successfully stored intelligence for user:', payload.user_id);
    
    // Calculate strategy recommendations
    const recommendations = generateStrategyRecommendations(payload);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Marketing intelligence received and stored',
        user_id: payload.user_id,
        strategy: recommendations,
        updated_at: data.updated_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Marketing Intel] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate strategy recommendations based on marketing intelligence
 */
function generateStrategyRecommendations(intel: MarketingIntelPayload): object {
  const underperforming = intel.underperforming_platforms || [];
  const topPlatform = intel.top_platform;
  
  const recommendations: Record<string, any> = {
    priority_platforms: underperforming.length > 0 ? underperforming : ['tiktok', 'instagram'],
    maintain_platforms: topPlatform ? [topPlatform] : [],
    content_volume_boost: {},
    hook_strategies: {},
  };

  // Calculate content volume boost for underperforming platforms
  underperforming.forEach(platform => {
    recommendations.content_volume_boost[platform] = 1.5; // 50% more content
  });

  // Hook strategies based on performance
  underperforming.forEach(platform => {
    recommendations.hook_strategies[platform] = {
      style: 'educational',
      focus: ['authority', 'expertise', 'problem-solution'],
      cta_type: 'value-driven',
    };
  });

  if (topPlatform) {
    recommendations.hook_strategies[topPlatform] = {
      style: 'engagement',
      focus: ['community', 'interaction', 'entertainment'],
      cta_type: 'engagement-driven',
    };
  }

  return recommendations;
}
