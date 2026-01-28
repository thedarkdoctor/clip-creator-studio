// Trend Analysis Worker
// Runs hourly to analyze raw trend data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FormatType = 'pov' | 'transformation' | 'tutorial' | 'meme' | 'storytime' | 'relatable' | 'aesthetic' | 'challenge' | 'other';

interface AnalyzedTrend {
  title: string;
  description?: string;
  platform: string;
  source_url: string;
  format_type: FormatType;
  hook_style: string;
  trend_score: number;
  avg_duration?: number;
  duration_range_min?: number;
  duration_range_max?: number;
  audio_name?: string;
  intro_type?: string;
  pacing_pattern?: string;
  editing_style?: string;
  caption_structure?: string;
  hashtags: string[];
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
}

// Format classification
function classifyFormat(title: string, description: string = '', hashtags: string[] = []): FormatType {
  const combined = `${title} ${description}`.toLowerCase();
  const hashtagStr = hashtags.join(' ').toLowerCase();
  
  if (combined.includes('pov') || combined.startsWith('pov:')) return 'pov';
  if (combined.includes('before') && combined.includes('after') || combined.includes('transformation') || combined.includes('glow up') || hashtagStr.includes('beforeandafter')) return 'transformation';
  if (combined.includes('how to') || combined.includes('tutorial') || combined.includes('step by step') || /\d+\s+(ways?|tips?|steps?|hacks?)/.test(combined)) return 'tutorial';
  if (combined.includes('when ') || combined.includes('meme') || combined.includes('literally me') || hashtagStr.includes('#meme')) return 'meme';
  if (combined.includes('story time') || combined.includes('storytime') || combined.includes('time i ') || combined.includes('remember when')) return 'storytime';
  if (combined.includes('relatable') || combined.includes('anyone else') || combined.includes('is it just me') || hashtagStr.includes('#relatable')) return 'relatable';
  if (combined.includes('aesthetic') || combined.includes('montage') || combined.includes('vibe') || hashtagStr.includes('#aesthetic')) return 'aesthetic';
  if (combined.includes('challenge') || hashtagStr.includes('#challenge')) return 'challenge';
  
  return 'other';
}

// Hook analysis
function analyzeHookStyle(title: string, description: string = ''): string {
  const firstWords = title.toLowerCase().split(' ').slice(0, 5).join(' ');
  const text = `${title} ${description}`.toLowerCase();
  
  if (firstWords.startsWith('pov')) return 'POV Storytelling';
  if (firstWords.includes('?') || firstWords.startsWith('how ') || firstWords.startsWith('why ')) return 'Question Hook';
  if (/^\d+/.test(firstWords)) return 'Numbered List';
  if (firstWords.startsWith('watch') || firstWords.startsWith('wait') || firstWords.startsWith('see')) return 'Call to Action';
  if (text.includes('!!') || text.includes('you won\'t believe') || firstWords.includes('shocking')) return 'Shock Hook';
  if (text.includes('must') || text.includes('need to') || text.includes('secret')) return 'Urgent/Secret';
  
  return 'Direct Statement';
}

// Pacing analysis
function analyzePacing(platform: string, duration?: number, formatType?: FormatType): string {
  if (platform === 'tiktok') return 'Fast-paced (2-3s cuts)';
  if (formatType === 'tutorial' || formatType === 'storytime') return 'Moderate pace (5-7s segments)';
  if (duration && duration < 20) return 'Very fast (1-2s cuts)';
  if (duration && duration < 35) return 'Fast-paced (2-4s cuts)';
  return 'Medium pace (4-6s cuts)';
}

// Intro type detection
function detectIntroType(title: string, formatType: FormatType): string {
  if (formatType === 'pov') return 'POV Scenario Setup';
  if (formatType === 'tutorial') return 'Promise/Outcome Hook';
  if (formatType === 'transformation') return 'Before State Reveal';
  if (title.toLowerCase().includes('text') || title.toLowerCase().includes('caption')) return 'Text Overlay Hook';
  return 'Visual Hook';
}

// Caption structure analysis
function analyzeCaptionStructure(title: string, description: string = ''): string {
  const combined = `${title} ${description}`;
  const emojiCount = (combined.match(/[\p{Emoji}]/gu) || []).length;
  const length = combined.length;
  
  let structure = '';
  if (length < 50) structure = 'Short & punchy';
  else if (length < 100) structure = 'Medium length';
  else structure = 'Long descriptive';
  
  if (emojiCount > 5) structure += ', heavy emoji';
  else if (emojiCount > 2) structure += ', moderate emoji';
  else if (emojiCount === 0) structure += ', no emoji';
  
  const hashtagCount = (combined.match(/#/g) || []).length;
  if (hashtagCount > 5) structure += ', hashtag-heavy';
  else if (hashtagCount > 0) structure += ', includes hashtags';
  
  return structure;
}

// Viral score calculation
function calculateViralScore(views: number = 0, likes: number = 0, shares: number = 0, comments: number = 0, platform: string): number {
  const platformMultiplier: Record<string, number> = {
    tiktok: 1.0,
    instagram: 1.2,
    youtube: 1.5,
    twitter: 0.8,
    facebook: 0.7,
  };
  
  const multiplier = platformMultiplier[platform] || 1.0;
  const score = ((views / 10000) + (likes / 100) * 2 + (shares * 5) + (comments * 3)) * multiplier;
  
  return Math.min(Math.round(score), 100);
}

// Main analysis function
function analyzeTrend(rawData: any): AnalyzedTrend {
  const title = rawData.title || '';
  const description = rawData.description || '';
  const hashtags = rawData.hashtags || [];
  const platform = rawData.platform;
  
  const format_type = classifyFormat(title, description, hashtags);
  const hook_style = analyzeHookStyle(title, description);
  const trend_score = calculateViralScore(rawData.views, rawData.likes, rawData.shares, rawData.comments, platform);
  const pacing_pattern = analyzePacing(platform, rawData.duration, format_type);
  const intro_type = detectIntroType(title, format_type);
  const caption_structure = analyzeCaptionStructure(title, description);
  
  let editing_style = 'Standard cuts';
  if (platform === 'tiktok' || format_type === 'meme') editing_style = 'Jump cuts & transitions';
  else if (format_type === 'aesthetic') editing_style = 'Smooth transitions';
  else if (format_type === 'tutorial') editing_style = 'Step-by-step progression';
  
  return {
    title,
    description,
    platform,
    source_url: rawData.source_url,
    format_type,
    hook_style,
    trend_score,
    avg_duration: rawData.duration,
    duration_range_min: rawData.duration ? Math.max(rawData.duration - 10, 10) : undefined,
    duration_range_max: rawData.duration ? rawData.duration + 10 : undefined,
    audio_name: rawData.audio_name,
    intro_type,
    pacing_pattern,
    editing_style,
    caption_structure,
    hashtags,
    views: rawData.views,
    likes: rawData.likes,
    shares: rawData.shares,
    comments: rawData.comments,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Analysis Worker] Starting trend analysis cycle...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch unprocessed raw trends
    const { data: rawTrends, error: fetchError } = await supabase
      .from('trend_raw_data')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch raw trends: ${fetchError.message}`);
    }

    console.log(`[Analysis Worker] Found ${rawTrends?.length || 0} unprocessed trends`);
    
    let processedCount = 0;
    let errorCount = 0;

    for (const raw of rawTrends || []) {
      try {
        const analyzed = analyzeTrend(raw.raw_payload);
        
        // Check for duplicates
        const { data: existing } = await supabase
          .from('trends_v2')
          .select('id')
          .eq('source_url', analyzed.source_url)
          .maybeSingle();

        if (existing) {
          console.log(`[Analysis Worker] Skipping duplicate: ${analyzed.title}`);
          await supabase
            .from('trend_raw_data')
            .update({ processed: true, processed_trend_id: existing.id })
            .eq('id', raw.id);
          continue;
        }

        // Store in trends_v2 table
        const { data: trend, error: trendError } = await supabase
          .from('trends_v2')
          .insert({
            title: analyzed.title,
            description: analyzed.description,
            platform: analyzed.platform,
            source_url: analyzed.source_url,
            trend_score: analyzed.trend_score,
            format_type: analyzed.format_type,
            avg_duration: analyzed.avg_duration,
            duration_range_min: analyzed.duration_range_min,
            duration_range_max: analyzed.duration_range_max,
            hook_style: analyzed.hook_style,
            audio_name: analyzed.audio_name,
          })
          .select()
          .single();

        if (trendError || !trend) {
          throw trendError || new Error('Failed to insert trend');
        }

        // Store pattern data
        await supabase.from('trend_patterns').insert({
          trend_id: trend.id,
          intro_type: analyzed.intro_type,
          pacing_pattern: analyzed.pacing_pattern,
          editing_style: analyzed.editing_style,
          caption_structure: analyzed.caption_structure,
        });

        // Store hashtags
        if (analyzed.hashtags && analyzed.hashtags.length > 0) {
          const hashtagInserts = analyzed.hashtags.map(tag => ({
            trend_id: trend.id,
            hashtag: tag,
          }));
          await supabase.from('trend_hashtags').insert(hashtagInserts);
        }

        // Store metrics
        if (analyzed.views || analyzed.likes || analyzed.shares || analyzed.comments) {
          const engagement_rate = analyzed.likes && analyzed.views
            ? ((analyzed.likes / analyzed.views) * 100).toFixed(2)
            : null;

          await supabase.from('trend_metrics').insert({
            trend_id: trend.id,
            views: analyzed.views,
            likes: analyzed.likes,
            shares: analyzed.shares,
            comments: analyzed.comments,
            engagement_rate,
          });
        }

        // Mark raw data as processed
        await supabase
          .from('trend_raw_data')
          .update({ processed: true, processed_trend_id: trend.id })
          .eq('id', raw.id);

        processedCount++;
        console.log(`[Analysis Worker] Processed: ${analyzed.title} (Score: ${analyzed.trend_score})`);
        
      } catch (error: any) {
        console.error(`[Analysis Worker] Failed to process trend ${raw.id}:`, error);
        errorCount++;
        
        await supabase
          .from('trend_raw_data')
          .update({ processed: true, error: error.message })
          .eq('id', raw.id);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Analysis Worker] Complete in ${duration}ms. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: rawTrends?.length || 0,
        duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Analysis Worker] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
