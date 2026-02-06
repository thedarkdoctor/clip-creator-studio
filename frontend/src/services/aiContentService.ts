/**
 * AI Content Service
 * Unified integration for all AI services used in content generation
 * - OpenAI: Script/caption generation
 * - Pexels: Stock footage
 * - ElevenLabs: Voiceover generation
 * - Jamendo: Background music
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// OPENAI - Script & Caption Generation
// ============================================================================

export interface ScriptGenerationParams {
  trendTitle: string;
  trendDescription?: string;
  trendHashtags?: string[];
  platform: string;
  businessName?: string;
  niche?: string;
  formatType?: string;
  hookStyle?: string;
}

export interface GeneratedScript {
  hook: string;
  hookStyle: string;
  valuePoint: string;
  authorityLine: string;
  cta: string;
  caption: string;
  hashtags: string[];
  fullScript: string;
  estimatedDuration: number;
}

/**
 * Generate script using OpenAI via Supabase Edge Function
 * Edge Function handles API key securely
 */
export async function generateScriptWithOpenAI(
  params: ScriptGenerationParams
): Promise<GeneratedScript> {
  try {
    console.log('[AI] Generating script with OpenAI:', params.trendTitle);

    // Call Supabase Edge Function that has OpenAI API key
    const { data, error } = await supabase.functions.invoke('script-generation', {
      body: {
        trend_title: params.trendTitle,
        trend_description: params.trendDescription,
        trend_hashtags: params.trendHashtags,
        platform: params.platform,
        business_name: params.businessName,
        niche: params.niche,
        format_type: params.formatType,
        hook_style: params.hookStyle,
      },
    });

    if (error) throw error;

    console.log('[AI] Script generated successfully');
    return data as GeneratedScript;
  } catch (error: any) {
    console.error('[AI] Script generation failed:', error);
    // Return fallback script
    return generateFallbackScript(params);
  }
}

/**
 * Generate fallback script when OpenAI is unavailable
 */
function generateFallbackScript(params: ScriptGenerationParams): GeneratedScript {
  const businessName = params.businessName || 'Your Business';
  const niche = params.niche || 'your industry';

  return {
    hook: `🔥 ${params.trendTitle}`,
    hookStyle: params.hookStyle || 'trending',
    valuePoint: `This is exactly what you need to know about ${niche}. ${businessName} is here to help!`,
    authorityLine: `We've helped thousands transform their ${niche} experience.`,
    cta: `Follow for more tips! 👉 ${params.trendHashtags?.[0] || '#trending'}`,
    caption: `${params.trendTitle} | ${businessName}`,
    hashtags: params.trendHashtags || ['#trending', '#viral', '#fyp'],
    fullScript: `${params.trendTitle}\n\nThis is exactly what you need to know about ${niche}. ${businessName} is here to help!\n\nWe've helped thousands transform their ${niche} experience.\n\nFollow for more tips!`,
    estimatedDuration: 30,
  };
}

// ============================================================================
// PEXELS - Stock Footage
// ============================================================================

export interface StockFootageParams {
  searchQuery: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  minDuration?: number;
  maxResults?: number;
}

export interface StockVideo {
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
}

/**
 * Fetch stock footage from Pexels via Edge Function
 */
export async function fetchStockFootage(
  params: StockFootageParams
): Promise<StockVideo[]> {
  try {
    console.log('[AI] Fetching stock footage from Pexels:', params.searchQuery);

    const { data, error } = await supabase.functions.invoke('stock-footage', {
      body: {
        query: params.searchQuery,
        orientation: params.orientation || 'portrait',
        min_duration: params.minDuration || 5,
        max_results: params.maxResults || 3,
      },
    });

    if (error) throw error;

    console.log(`[AI] Fetched ${data?.videos?.length || 0} stock videos`);
    return data?.videos || [];
  } catch (error: any) {
    console.error('[AI] Stock footage fetch failed:', error);
    return [];
  }
}

// ============================================================================
// ELEVENLABS - Voiceover Generation
// ============================================================================

export interface VoiceoverParams {
  text: string;
  voiceId?: string;
  voiceName?: 'professional' | 'friendly' | 'energetic' | 'calm';
  modelId?: string;
}

/**
 * Generate voiceover using ElevenLabs via Edge Function
 */
export async function generateVoiceover(
  params: VoiceoverParams
): Promise<string | null> {
  try {
    console.log('[AI] Generating voiceover with ElevenLabs');

    // Map voice names to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      professional: 'JBFqnCBsd6RMkjVDRZzb', // George
      friendly: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      energetic: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
      calm: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    };

    const voiceId = params.voiceId || voiceMap[params.voiceName || 'friendly'];

    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text: params.text,
        voice_id: voiceId,
        model_id: params.modelId || 'eleven_multilingual_v2',
      },
    });

    if (error) throw error;

    console.log('[AI] Voiceover generated successfully');
    return data?.audio_url || null;
  } catch (error: any) {
    console.error('[AI] Voiceover generation failed:', error);
    return null;
  }
}

// ============================================================================
// JAMENDO - Background Music
// ============================================================================

export interface MusicParams {
  mood?: 'upbeat' | 'energetic' | 'calm' | 'corporate' | 'motivational';
  duration?: number;
}

export interface MusicTrack {
  url: string;
  title: string;
  artist: string;
  duration: number;
}

/**
 * Fetch royalty-free background music from Jamendo via Edge Function
 */
export async function fetchBackgroundMusic(
  params: MusicParams
): Promise<MusicTrack | null> {
  try {
    console.log('[AI] Fetching background music from Jamendo:', params.mood);

    const { data, error } = await supabase.functions.invoke('background-music', {
      body: {
        mood: params.mood || 'upbeat',
        duration: params.duration || 30,
      },
    });

    if (error) throw error;

    console.log('[AI] Background music fetched successfully');
    return data?.track || null;
  } catch (error: any) {
    console.error('[AI] Background music fetch failed:', error);
    return null;
  }
}

// ============================================================================
// COMPLETE CONTENT GENERATION
// ============================================================================

export interface ContentGenerationParams {
  trendId: string;
  trendTitle: string;
  trendDescription?: string;
  trendHashtags?: string[];
  platform: string;
  businessName?: string;
  niche?: string;
  formatType?: string;
  hookStyle?: string;
}

export interface GeneratedContent {
  script: GeneratedScript;
  voiceoverUrl?: string;
  stockFootageUrls: string[];
  backgroundMusicUrl?: string;
}

/**
 * Generate complete content with all AI services
 */
export async function generateCompleteContent(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  console.log('[AI] Starting complete content generation');

  try {
    // Step 1: Generate script
    const script = await generateScriptWithOpenAI({
      trendTitle: params.trendTitle,
      trendDescription: params.trendDescription,
      trendHashtags: params.trendHashtags,
      platform: params.platform,
      businessName: params.businessName,
      niche: params.niche,
      formatType: params.formatType,
      hookStyle: params.hookStyle,
    });

    // Step 2: Generate assets in parallel
    const [voiceoverUrl, stockFootage, backgroundMusic] = await Promise.all([
      // Voiceover from script
      generateVoiceover({
        text: script.fullScript,
        voiceName: 'friendly',
      }),
      
      // Stock footage based on niche
      fetchStockFootage({
        searchQuery: params.niche || params.trendTitle,
        orientation: 'portrait',
        maxResults: 3,
      }),
      
      // Background music
      fetchBackgroundMusic({
        mood: 'upbeat',
        duration: script.estimatedDuration,
      }),
    ]);

    console.log('[AI] Complete content generation successful');

    return {
      script,
      voiceoverUrl: voiceoverUrl || undefined,
      stockFootageUrls: stockFootage.map(v => v.url),
      backgroundMusicUrl: backgroundMusic?.url || undefined,
    };
  } catch (error) {
    console.error('[AI] Complete content generation failed:', error);
    throw error;
  }
}
