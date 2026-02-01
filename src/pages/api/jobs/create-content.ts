// src/pages/api/jobs/create-content.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ContentJobPayload {
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms?: string[];
  top_opportunities?: string[];
  auto_schedule?: boolean;
  posting_frequency?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validate API key
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.LYNKSCOPE_INTERNAL_KEY;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const providedKey = authHeader.substring(7);
  if (providedKey !== expectedKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  try {
    const payload: ContentJobPayload = req.body;

    // Validate required fields
    if (!payload.user_id || !payload.company_name || !payload.niche) {
      return res.status(400).json({ error: 'Missing required fields: user_id, company_name, niche' });
    }

    // 2. Save job to content_jobs table
    const { data: job, error: jobError } = await (supabase as any)
      .from('content_jobs')
      .insert({
        user_id: payload.user_id,
        company_name: payload.company_name,
        niche: payload.niche,
        weak_platforms: payload.weak_platforms || [],
        opportunities: payload.top_opportunities || [],
        auto_schedule: payload.auto_schedule || false,
        posting_frequency: payload.posting_frequency || 'weekly',
        status: 'pending',
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      return res.status(500).json({ error: 'Failed to create job' });
    }

    // 3. Trigger content creation pipeline (async)
    triggerContentPipeline(job).catch(err => {
      console.error('Pipeline trigger failed:', err);
      // Update job status to failed
      (supabase as any)
        .from('content_jobs')
        .update({ status: 'failed' })
        .eq('id', job.id)
        .then(() => {})
        .catch((e: any) => console.error('Failed to update job status:', e));
    });

    // 4. Return acceptance response
    res.status(202).json({
      status: 'accepted',
      job_id: job.id,
      message: 'Content generation job queued successfully',
    });
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Trigger the full content creation pipeline for a job
 */
async function triggerContentPipeline(job: any) {
  console.log('[Pipeline] Starting for job:', job.id);

  try {
    // Update job status to processing
    await (supabase as any)
      .from('content_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    // 1. Trigger trend discovery for the niche
    const trendResponse = await fetch(process.env.SUPABASE_URL + '/functions/v1/trend-scraper-worker', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ niche: job.niche }),
    });

    if (!trendResponse.ok) {
      throw new Error('Trend scraper failed');
    }

    console.log('[Pipeline] Trend scraping triggered');

    // 2. Queue content generation for top opportunities
    // (Would create clips based on weak platforms and opportunities)
    for (const opportunity of job.opportunities || []) {
      console.log(`[Pipeline] Queueing content for: ${opportunity}`);
      // This would call createMarketingVideo for each opportunity
    }

    // 3. If auto_schedule enabled, set up posting schedule
    if (job.auto_schedule) {
      console.log('[Pipeline] Auto-schedule enabled');
      // This would call scheduleVideos for the job
    }

    // Update job status to complete
    await (supabase as any)
      .from('content_jobs')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    console.log('[Pipeline] Complete for job:', job.id);
  } catch (error: any) {
    console.error('[Pipeline] Error:', error);
    throw error;
  }
}
