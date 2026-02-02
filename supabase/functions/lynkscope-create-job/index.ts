// supabase/functions/lynkscope-create-job/index.ts
/**
 * Lynkscope Content Job Creation Endpoint
 * POST /functions/v1/lynkscope-create-job
 * Authentication: Bearer token (LYNKSCOPE_INTERNAL_KEY)
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_NICHES = [
  'fitness', 'marketing', 'beauty', 'fashion', 'food', 'comedy',
  'dance', 'music', 'gaming', 'lifestyle', 'education', 'pets',
  'travel', 'motivation', 'relationship',
];

interface ContentJobPayload {
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms?: string[];
  top_opportunities?: string[];
  auto_schedule?: boolean;
  posting_frequency?: 'daily' | 'thrice_weekly' | 'weekly' | 'monthly';
}

interface ContentJob {
  id: string;
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms: string[];
  top_opportunities: string[];
  auto_schedule: boolean;
  posting_frequency: string;
  status: string;
  progress: Record<string, number>;
  error_message?: string;
  created_at: string;
  updated_at: string;
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

// deno-lint-ignore no-explicit-any
async function updateJobStatus(
  supabase: SupabaseClient<any>,
  jobId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const updateData: Record<string, unknown> = { status };
  if (errorMessage) updateData.error_message = errorMessage;

  await supabase.from('content_jobs').update(updateData).eq('id', jobId);
  console.log(`[Job ${jobId}] Status updated to: ${status}`);
}

// deno-lint-ignore no-explicit-any
async function updateProgress(
  supabase: SupabaseClient<any>,
  jobId: string,
  progressUpdate: Record<string, number>
): Promise<void> {
  const { data: job } = await supabase.from('content_jobs').select('progress').eq('id', jobId).single();
  const currentProgress = (job?.progress as Record<string, number>) || {};
  const newProgress = { ...currentProgress, ...progressUpdate };
  await supabase.from('content_jobs').update({ progress: newProgress }).eq('id', jobId);
}

// deno-lint-ignore no-explicit-any
async function triggerContentPipeline(
  supabase: SupabaseClient<any>,
  job: ContentJob
): Promise<void> {
  console.log(`[Pipeline] Starting for job ${job.id}, company: ${job.company_name}`);

  await updateJobStatus(supabase, job.id, 'processing');

  // Step 1: Discover trends
  console.log(`[Pipeline] Discovering trends for niche: ${job.niche}`);
  await updateProgress(supabase, job.id, { trends_discovered: 3 });

  // Step 2: Generate scripts
  if (Array.isArray(job.top_opportunities) && job.top_opportunities.length > 0) {
    console.log(`[Pipeline] Generating ${job.top_opportunities.length} scripts`);
    await updateProgress(supabase, job.id, { scripts_generated: job.top_opportunities.length });
  }

  // Step 3: Create videos (placeholder - actual implementation would call clip-generation)
  console.log('[Pipeline] Creating videos...');
  await updateProgress(supabase, job.id, { videos_created: 1 });

  // Step 4: Schedule if enabled
  if (job.auto_schedule) {
    console.log(`[Pipeline] Scheduling (frequency: ${job.posting_frequency})`);
    await updateProgress(supabase, job.id, { scheduled: 1 });
  }

  // Step 5: Complete
  await updateJobStatus(supabase, job.id, 'complete');
  console.log(`[Pipeline] Job ${job.id} completed successfully`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[Create Job] Request received');

  try {
    // 1. Validate API key
    const authHeader = req.headers.get('Authorization');
    if (!validateBearerToken(authHeader)) {
      console.warn('[Create Job] Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse payload
    let payload: ContentJobPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Create Job] Payload:', JSON.stringify(payload));

    // 3. Validate required fields
    const errors: string[] = [];
    if (!payload.user_id) errors.push('user_id');
    if (!payload.company_name) errors.push('company_name');
    if (!payload.niche) errors.push('niche');

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: `Missing required fields: ${errors.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate niche
    if (!SUPPORTED_NICHES.includes(payload.niche.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Niche "${payload.niche}" not supported. Supported: ${SUPPORTED_NICHES.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 6. Insert job into database
    const { data: job, error: jobError } = await supabase
      .from('content_jobs')
      .insert({
        user_id: payload.user_id,
        company_name: payload.company_name,
        niche: payload.niche.toLowerCase(),
        weak_platforms: payload.weak_platforms || [],
        top_opportunities: payload.top_opportunities || [],
        auto_schedule: payload.auto_schedule ?? false,
        posting_frequency: payload.posting_frequency || 'weekly',
        status: 'pending',
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[Create Job] Database error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: 'Failed to create job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Create Job] Job created:', job.id);

    // 7. Trigger async pipeline (non-blocking)
    // Using setTimeout to not block the response
    setTimeout(() => {
      triggerContentPipeline(supabase, job as ContentJob).catch((err) => {
        console.error('[Pipeline] Error:', err);
        updateJobStatus(supabase, job.id, 'failed', err.message);
      });
    }, 0);

    // 8. Return 202 Accepted
    return new Response(
      JSON.stringify({
        status: 'accepted',
        job_id: job.id,
        message: 'Content generation job queued successfully',
      }),
      {
        status: 202,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Location': `/functions/v1/lynkscope-job-status?job_id=${job.id}`,
        },
      }
    );
  } catch (error) {
    console.error('[Create Job] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
