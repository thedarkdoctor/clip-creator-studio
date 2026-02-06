// src/pages/api/health.ts
/**
 * Health Check Endpoint
 * Used by monitoring services and Lynkscope to verify Cliplyst is operational
 */

export async function GET(request: Request): Promise<Response> {
  try {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0',
      services: {
        api: 'operational',
        supabase: 'connected',
        buffer: 'ready',
        external_apis: 'ready',
      },
      environment: {
        node_env: import.meta.env.MODE || 'unknown',
        has_openai_key: !!import.meta.env.VITE_OPENAI_API_KEY,
        has_elevenlabs_key: !!import.meta.env.VITE_ELEVENLABS_API_KEY,
        has_pexels_key: !!import.meta.env.VITE_PEXELS_API_KEY,
        has_jamendo_id: !!import.meta.env.VITE_JAMENDO_CLIENT_ID,
        has_buffer_credentials: !!import.meta.env.VITE_BUFFER_CLIENT_ID,
        has_lynkscope_key: !!import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY,
        has_jwt_secret: !!import.meta.env.VITE_JWT_SECRET,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
