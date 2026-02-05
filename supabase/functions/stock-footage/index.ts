// Supabase Edge Function: stock-footage
// Fetches stock video footage from Pexels

const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockFootageRequest {
  query: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  min_duration?: number;
  max_results?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const {
      query,
      orientation = 'portrait',
      min_duration = 5,
      max_results = 3,
    }: StockFootageRequest = await req.json();

    console.log('[StockFootage] Fetching videos for:', query);

    if (!PEXELS_API_KEY) {
      throw new Error('Pexels API key not configured');
    }

    // Call Pexels API
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${max_results}`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('[StockFootage] Pexels API error:', response.statusText);
      throw new Error('Pexels API request failed');
    }

    const data = await response.json();
    
    // Filter and format videos
    const videos = (data.videos || [])
      .filter((video: any) => video.duration >= min_duration)
      .slice(0, max_results)
      .map((video: any) => {
        // Get highest quality video file
        const videoFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
        
        return {
          url: videoFile.link,
          thumbnailUrl: video.image,
          duration: video.duration,
          width: video.width,
          height: video.height,
        };
      });

    console.log(`[StockFootage] Found ${videos.length} videos`);

    return new Response(
      JSON.stringify({ videos }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[StockFootage] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Stock footage fetch failed', videos: [] }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
