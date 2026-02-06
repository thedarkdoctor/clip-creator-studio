// Supabase Edge Function: background-music
// Fetches royalty-free background music from Jamendo

const JAMENDO_CLIENT_ID = Deno.env.get('JAMENDO_CLIENT_ID') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MusicRequest {
  mood?: string;
  duration?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { mood = 'upbeat', duration = 30 }: MusicRequest = await req.json();

    console.log('[BackgroundMusic] Fetching music:', mood);

    if (!JAMENDO_CLIENT_ID) {
      console.warn('[BackgroundMusic] Jamendo API key not configured, returning null');
      return new Response(
        JSON.stringify({ track: null, message: 'Music service not configured' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Map moods to Jamendo tags
    const moodTags: Record<string, string> = {
      upbeat: 'upbeat',
      energetic: 'energetic',
      calm: 'relaxing',
      corporate: 'corporate',
      motivational: 'motivational',
    };

    const tags = moodTags[mood] || 'upbeat';

    // Call Jamendo API with fuzzytags for better results
    const response = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=5&fuzzytags=${tags}&audioformat=mp32&include=musicinfo`
    );

    if (!response.ok) {
      console.error('[BackgroundMusic] Jamendo API error:', response.statusText);
      // Return null instead of throwing - music is optional
      return new Response(
        JSON.stringify({ track: null, message: 'Music API unavailable' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log('[BackgroundMusic] No tracks found, returning null');
      return new Response(
        JSON.stringify({ track: null, message: 'No tracks found' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const track = data.results[0];

    console.log('[BackgroundMusic] Found track:', track.name);

    return new Response(
      JSON.stringify({
        track: {
          url: track.audio || track.audiodownload,
          title: track.name,
          artist: track.artist_name,
          duration: track.duration,
        },
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[BackgroundMusic] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Background music fetch failed', track: null }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
