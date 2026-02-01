// src/pages/api/jobs/[jobId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key
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
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    // Fetch job status
    const { data: job, error: jobError } = await (supabase as any)
      .from('content_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({
      id: job.id,
      status: job.status,
      company_name: job.company_name,
      niche: job.niche,
      weak_platforms: job.weak_platforms,
      opportunities: job.opportunities,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
