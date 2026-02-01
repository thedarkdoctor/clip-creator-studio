// src/pages/api/jobs/[jobId].ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Validate API key
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.LYNKSCOPE_INTERNAL_KEY;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401 });
  }

  const providedKey = authHeader.substring(7);
  if (providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.pathname.split('/').pop();

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Invalid job ID' }), { status: 400 });
    }

    // Fetch job status
    const { data: job, error: jobError } = await (supabase as any)
      .from('content_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({
      id: job.id,
      status: job.status,
      company_name: job.company_name,
      niche: job.niche,
      weak_platforms: job.weak_platforms,
      opportunities: job.opportunities,
      created_at: job.created_at,
      updated_at: job.updated_at,
    }), { status: 200 });
  } catch (error: any) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
