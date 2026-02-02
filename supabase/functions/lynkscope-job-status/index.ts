// supabase/functions/lynkscope-job-status/index.ts
/**
 * Lynkscope Job Status Endpoint
 * GET /functions/v1/lynkscope-job-status?job_id=<uuid>
 * Authentication: Bearer token (LYNKSCOPE_INTERNAL_KEY)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
 * Validate Bearer token
 */
function validateBearerToken(authHeader: string | null): boolean {
  if (!authHeader) return false;
  
  const expectedKey = Deno.env.get('LYNKSCOPE_INTERNAL_KEY');
  if (!expectedKey) {
    console.error('[Auth] LYNKSCOPE_INTERNAL_KEY not configured');
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return false;

  return constantTimeCompare(token, expectedKey);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[Job Status] Request received');

  try {
    // 1. Validate API key
    const authHeader = req.headers.get('Authorization');
    if (!validateBearerToken(authHeader)) {
      console.warn('[Job Status] Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get job_id from query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Missing job_id query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Job Status] Looking up job:', jobId);

    // 3. Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Fetch job
    const { data: job, error: jobError } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.warn('[Job Status] Job not found:', jobId);
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Job Status] Found job:', job.id, 'status:', job.status);

    // 5. Return job status
    return new Response(
      JSON.stringify({
        id: job.id,
        status: job.status,
        company_name: job.company_name,
        niche: job.niche,
        weak_platforms: job.weak_platforms,
        top_opportunities: job.top_opportunities,
        auto_schedule: job.auto_schedule,
        posting_frequency: job.posting_frequency,
        progress: job.progress,
        error_message: job.error_message,
        created_at: job.created_at,
        updated_at: job.updated_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Job Status] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
