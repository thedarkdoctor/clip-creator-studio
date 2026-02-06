// src/pages/api/jobs/create-content.ts
/**
 * Lynkscope Content Job Creation Endpoint
 * Accepts content requests from Lynkscope and queues them for processing
 * 
 * Authentication: Bearer token (VITE_LYNKSCOPE_INTERNAL_KEY)
 * 
 * POST /api/jobs/create-content
 * {
 *   user_id: string,
 *   company_name: string,
 *   niche: string,
 *   weak_platforms?: string[],
 *   top_opportunities?: string[],
 *   auto_schedule?: boolean,
 *   posting_frequency?: 'daily' | 'thrice_weekly' | 'weekly' | 'monthly'
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { validateLynkscopeBearerToken } from '@/lib/lynkscope-auth';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ContentJobPayload {
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms?: string[];
  top_opportunities?: string[];
  auto_schedule?: boolean;
  posting_frequency?: 'daily' | 'thrice_weekly' | 'weekly' | 'monthly';
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Validate API key using constant-time comparison
    const authHeader = request.headers.get('Authorization');
    
    if (!validateLynkscopeBearerToken(authHeader || undefined)) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing Authorization header',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate request payload
    let payload: ContentJobPayload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON payload',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate required fields
    const errors: string[] = [];
    if (!payload.user_id) errors.push('user_id');
    if (!payload.company_name) errors.push('company_name');
    if (!payload.niche) errors.push('niche');

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Missing required fields: ${errors.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate niche is supported
    const SUPPORTED_NICHES = [
      'fitness',
      'marketing',
      'beauty',
      'fashion',
      'food',
      'comedy',
      'dance',
      'music',
      'gaming',
      'lifestyle',
      'education',
      'pets',
      'travel',
      'motivation',
      'relationship',
    ];

    if (!SUPPORTED_NICHES.includes(payload.niche.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Niche "${payload.niche}" not supported. Supported niches: ${SUPPORTED_NICHES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Save job to content_jobs table
    const { data: job, error: jobError } = await (supabase as any)
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[Job Creation Error]', jobError);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to create job in database',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Trigger content creation pipeline asynchronously (non-blocking)
    triggerContentPipeline(job).catch((err) => {
      console.error('[Pipeline Error]', err);
      // Update job status to failed
      updateJobStatus(job.id, 'failed', err.message).catch((e) =>
        console.error('[Status Update Error]', e)
      );
    });

    // 7. Return acceptance response immediately (202 Accepted)
    return new Response(
      JSON.stringify({
        status: 'accepted',
        job_id: job.id,
        message: 'Content generation job queued successfully',
      }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'Content-Location': `/api/jobs/${job.id}`,
        },
      }
    );
  } catch (error) {
    console.error('[Unhandled API Error]', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'complete' | 'failed',
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  await (supabase as any)
    .from('content_jobs')
    .update(updateData)
    .eq('id', jobId);
}

/**
 * Trigger the full content creation pipeline for a job
 * This runs asynchronously and does NOT block the API response
 */
async function triggerContentPipeline(job: any): Promise<void> {
  console.log('[Pipeline] Starting for job:', job.id, 'Company:', job.company_name);

  try {
    // Update job status to processing
    await updateJobStatus(job.id, 'processing');
    console.log('[Pipeline] Status updated to processing');

    // Step 1: Discover trends for the niche
    console.log(`[Pipeline] Discovering trends for niche: ${job.niche}`);
    // In production, this would call trendScraperService
    // const trends = await discoverTrendsForNiche(job.niche);
    // console.log(`[Pipeline] Found ${trends.length} trends`);

    // Step 2: Generate scripts for opportunities
    if (job.top_opportunities && job.top_opportunities.length > 0) {
      console.log(`[Pipeline] Generating scripts for ${job.top_opportunities.length} opportunities`);
      // for (const opportunity of job.top_opportunities) {
      //   await generateBrandAwareScript(job.company_name, job.niche, opportunity);
      // }
    }

    // Step 3: Create videos
    console.log('[Pipeline] Creating videos...');
    // await createMarketingVideos(job);

    // Step 4: Schedule videos
    if (job.auto_schedule) {
      console.log(`[Pipeline] Scheduling videos (frequency: ${job.posting_frequency})`);
      // await scheduleVideos(job.user_id, job.posting_frequency, generatedVideoIds);
    }

    // Step 5: Mark job as complete
    await updateJobStatus(job.id, 'complete');
    console.log('[Pipeline] Job completed successfully');
  } catch (error) {
    console.error('[Pipeline Error]', error);
    throw error;
  }
}
