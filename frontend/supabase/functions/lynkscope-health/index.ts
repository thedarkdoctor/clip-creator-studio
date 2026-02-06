// supabase/functions/lynkscope-health/index.ts
/**
 * Health Check Endpoint for Lynkscope Integration
 * GET /functions/v1/lynkscope-health
 * No authentication required
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  console.log('[Health Check] Request received');

  try {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0',
      service: 'cliplyst-content-engine',
      endpoints: {
        health: '/functions/v1/lynkscope-health',
        createJob: '/functions/v1/lynkscope-create-job',
        getJob: '/functions/v1/lynkscope-job-status',
      },
      capabilities: [
        'niche-aware-trend-scraping',
        'ai-script-generation',
        'video-clip-creation',
        'auto-scheduling',
        'zapier-publishing',
      ],
    };

    console.log('[Health Check] Returning OK');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
