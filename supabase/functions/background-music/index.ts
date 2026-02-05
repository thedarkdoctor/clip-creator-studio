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
      throw new Error('Jamendo API key not configured');
    }

    // Map moods to Jamendo tags
    const moodTags: Record<string, string> = {
      upbeat: 'upbeat,energetic',
      energetic: 'energetic,motivational',
      calm: 'calm,relaxed',
      corporate: 'corporate,business',
      motivational: 'motivational,inspiring',
    };

    const tags = moodTags[mood] || 'upbeat';

    // Call Jamendo API
    const response = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1&tags=${tags},instrumental&audioformat=mp32`
    );

    if (!response.ok) {
      console.error('[BackgroundMusic] Jamendo API error:', response.statusText);
      throw new Error('Jamendo API request failed');
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No music tracks found');
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
