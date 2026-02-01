// src/services/contentCreationService.ts
import { supabase } from '@/integrations/supabase/client';
import { generateNicheKeywords } from '../lib/generateNicheKeywords';
import { generateBrandAwareScript } from '../lib/generateBrandAwareScript';

// Helper: Fetch user and trend context
async function loadContext(userId: string, trendId: string) {
  const { data: user, error: userError } = await (supabase as any).from('users').select('id, business_name, niche').eq('id', userId).single();
  if (userError || !user) throw new Error('User not found');
  const { data: trend, error: trendError } = await (supabase as any).from('trends_v2').select('*').eq('id', trendId).single();
  if (trendError || !trend) throw new Error('Trend not found');
  return { user: user as { id: string; business_name: string; niche: string }, trend };
}

// Helper: Brand-aware script generation
async function generateScript(user: any, trend: any) {
  return generateBrandAwareScript(user, trend);
}

// Helper: Voiceover (ElevenLabs)
async function generateVoiceover(script_body: string, niche: string) {
  const voice = niche === 'fitness' ? 'Adam' : 'Rachel'; // Example: pick voice by niche
  const resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script_body,
      voice: voice,
      model_id: 'eleven_multilingual_v1',
    }),
  });
  const data = await resp.json();
  return data.audio_url;
}

// Helper: Visual scenes (Pexels)
async function generateVisualSceneList(script: any, niche: string) {
  const keywords = generateNicheKeywords(niche);
  const queries = [niche, ...keywords].slice(0, 8);
  const clips: string[] = [];
  for (const q of queries) {
    const resp = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=1`, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
    });
    const data = await resp.json();
    if (data.videos && data.videos[0]) {
      clips.push(data.videos[0].video_files[0].link);
    }
    if (clips.length >= 8) break;
  }
  return clips;
}

// Helper: Music (Jamendo)
async function fetchMusic(niche: string) {
  const mood = niche === 'fitness' ? 'motivational' : 'corporate';
  const resp = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${process.env.JAMENDO_CLIENT_ID}&client_secret=${process.env.JAMENDO_CLIENT_SECRET}&format=json&limit=1&tags=${mood},instrumental`);
  const data = await resp.json();
  return data.results[0]?.audio || null;
}

// Helper: Send to video rendering service
async function assembleVideoJob({ scenes, voiceover, music, subtitles }: { scenes: string[]; voiceover: string; music: string; subtitles: string; }) {
  // Example: send to FFmpeg worker endpoint
  const resp = await fetch(process.env.VIDEO_RENDER_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes,
      voiceover,
      music,
      subtitles,
      format: 'vertical',
      aspect: '9:16',
      duration_target: 30,
    }),
  });
  const data = await resp.json();
  return data.video_url;
}

// Main pipeline
export async function createMarketingVideo(trendId: string, userId: string) {
  // 1. Load context
  const { user, trend } = await loadContext(userId, trendId);
  // 2. Script (brand-aware)
  const script = await generateScript(user, trend);
  // 3. Voiceover
  const audio_url = await generateVoiceover(script.value_point, user.niche);
  // 4. Visuals
  const scenes = await generateVisualSceneList(script, user.niche);
  // 5. Music
  const music_url = await fetchMusic(user.niche);
  // 6. Video assembly
  const video_url = await assembleVideoJob({ scenes, voiceover: audio_url, music: music_url, subtitles: script.value_point });
  // 7. Save result
  // Table 'generated_videos' does not exist in current Supabase types. Use 'videos' as fallback or comment out.
  // await supabase.from('generated_videos').insert({
  //   user_id: userId,
  //   trend_id: trendId,
  //   video_url,
  //   caption: script.caption,
  //   hashtags: script.hashtags,
  //   created_at: new Date().toISOString(),
  //   status: 'complete',
  // });
  return video_url;
}
