// Supabase Edge Function: elevenlabs-tts
// Generates voiceover audio using ElevenLabs Text-to-Speech

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice_id?: string;
  model_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const {
      text,
      voice_id = 'EXAVITQu4vr4xnSDxMaL', // Default: Sarah - friendly
      model_id = 'eleven_multilingual_v2',
    }: TTSRequest = await req.json();

    console.log('[ElevenLabs] Generating voiceover, text length:', text.length);

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] API error:', error);
      throw new Error('ElevenLabs API request failed');
    }

    // Get audio data
    const audioData = await response.arrayBuffer();

    console.log('[ElevenLabs] Voiceover generated, size:', audioData.byteLength);

    // Return audio data as base64 for easier handling
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));

    return new Response(
      JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
        size: audioData.byteLength,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ElevenLabs] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Voiceover generation failed', audio_url: null }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
