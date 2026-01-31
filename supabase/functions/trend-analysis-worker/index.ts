// Trend Analysis Worker - Optimized for TikTok Intelligence
// Processes raw trend data with improved scoring and niche matching

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// UTILITY: PARSE NUMERIC VALUES (handles "1.2e+06" strings)
// ============================================================================

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return 0;
}

// ============================================================================
// FORMAT CLASSIFICATION (IMPROVED FOR TIKTOK)
// ============================================================================

function classifyFormat(title: string, description: string = '', hashtags: string[] = []): FormatType {
  const combined = `${title} ${description}`.toLowerCase();
  const hashtagStr = hashtags.join(' ').toLowerCase();
  
  // POV - very common on TikTok
  if (combined.includes('pov') || combined.startsWith('pov:') || combined.startsWith('pov ')) {
    return 'pov';
  }
  
  // Transformation / Before-After
  if (combined.includes('before') && combined.includes('after') ||
      combined.includes('transformation') ||
      combined.includes('glow up') ||
      combined.includes('glowup') ||
      hashtagStr.includes('beforeandafter') ||
      hashtagStr.includes('glowup')) {
    return 'transformation';
  }
  
  // Tutorial / How-to
  if (combined.includes('how to') ||
      combined.includes('tutorial') ||
      combined.includes('step by step') ||
      combined.includes('here\'s how') ||
      /\d+\s+(ways?|tips?|steps?|hacks?|things?)/.test(combined)) {
    return 'tutorial';
  }
  
  // Meme / Relatable humor
  if (combined.includes('when ') && (combined.includes('you') || combined.includes('your')) ||
      combined.includes('meme') ||
      combined.includes('literally me') ||
      combined.includes('be like') ||
      hashtagStr.includes('meme')) {
    return 'meme';
  }
  
  // Storytime
  if (combined.includes('story time') ||
      combined.includes('storytime') ||
      combined.includes('the time i ') ||
      combined.includes('that time when') ||
      combined.includes('remember when')) {
    return 'storytime';
  }
  
  // Relatable content
  if (combined.includes('relatable') ||
      combined.includes('anyone else') ||
      combined.includes('is it just me') ||
      combined.includes('tell me you') ||
      hashtagStr.includes('relatable')) {
    return 'relatable';
  }
  
  // Aesthetic / Montage
  if (combined.includes('aesthetic') ||
      combined.includes('montage') ||
      combined.includes('vibe') ||
      combined.includes('asmr') ||
      hashtagStr.includes('aesthetic')) {
    return 'aesthetic';
  }
  
  // Challenge / Dance
  if (combined.includes('challenge') ||
      combined.includes('dance') ||
      combined.includes('choreo') ||
      hashtagStr.includes('challenge') ||
      hashtagStr.includes('dance')) {
    return 'challenge';
  }
  
  return 'other';
}

// ============================================================================
// HOOK STYLE ANALYSIS (IMPROVED)
// ============================================================================

function analyzeHookStyle(title: string, description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  const firstWords = title.toLowerCase().split(' ').slice(0, 6).join(' ');
  
  if (firstWords.startsWith('pov')) return 'POV Storytelling';
  if (firstWords.includes('?') || firstWords.startsWith('how ') || firstWords.startsWith('why ') || firstWords.startsWith('what ') || firstWords.startsWith('who ')) return 'Question Hook';
  if (/^\d+/.test(firstWords) || firstWords.includes('top ')) return 'Numbered List';
  if (firstWords.startsWith('watch') || firstWords.startsWith('wait') || firstWords.startsWith('see') || firstWords.includes('wait for it') || firstWords.includes('stay till')) return 'Suspense/Wait Hook';
  if (text.includes('!!') || text.includes('you won\'t believe') || firstWords.includes('shocking') || text.includes('😱') || text.includes('🤯')) return 'Shock Hook';
  if (text.includes('must') || text.includes('need to') || text.includes('secret') || text.includes('nobody knows')) return 'Urgent/Secret';
  if (firstWords.includes('when ') || firstWords.includes('that moment')) return 'Relatable Opener';
  if (firstWords.startsWith('this ') || firstWords.startsWith('that ')) return 'This/That Hook';
  
  return 'Direct Statement';
}

// ============================================================================
// VIRAL SCORE CALCULATION (OPTIMIZED FOR TIKTOK)
// ============================================================================

function calculateViralScore(
  views: any,
  likes: any,
  shares: any,
  comments: any,
  duration?: number,
  formatType?: FormatType
): number {
  const v = parseNumericValue(views);
  const l = parseNumericValue(likes);
  const s = parseNumericValue(shares);
  const c = parseNumericValue(comments);
  
  // No metrics = low score
  if (v === 0 && l === 0) {
    return 5;
  }
  
  // Calculate engagement rate
  const engagementRate = v > 0 ? ((l + c + s) / v) * 100 : 0;
  
  // Base score from views (logarithmic scale for fairness)
  let score = 0;
  
  if (v >= 10000000) score += 40;       // 10M+ views
  else if (v >= 1000000) score += 35;   // 1M+ views
  else if (v >= 500000) score += 30;    // 500K+ views  
  else if (v >= 100000) score += 25;    // 100K+ views
  else if (v >= 50000) score += 20;     // 50K+ views
  else if (v >= 10000) score += 15;     // 10K+ views
  else if (v >= 1000) score += 10;      // 1K+ views
  else score += 5;
  
  // Engagement rate bonus (TikTok avg is 3-9%)
  if (engagementRate >= 15) score += 25;      // Exceptional
  else if (engagementRate >= 10) score += 20; // Great
  else if (engagementRate >= 5) score += 15;  // Good
  else if (engagementRate >= 3) score += 10;  // Average
  else if (engagementRate >= 1) score += 5;   // Below average
  
  // Shares are highly valuable (virality indicator)
  if (s >= 10000) score += 15;
  else if (s >= 1000) score += 10;
  else if (s >= 100) score += 5;
  
  // Comments indicate discussion value
  if (c >= 5000) score += 10;
  else if (c >= 1000) score += 7;
  else if (c >= 100) score += 4;
  
  // Duration bonus for TikTok (15-45s is optimal)
  if (duration) {
    if (duration >= 15 && duration <= 45) score += 5;
    else if (duration < 15 || duration <= 60) score += 3;
  }
  
  // Format type bonus (some formats perform better)
  if (formatType === 'pov' || formatType === 'challenge') score += 5;
  else if (formatType === 'transformation' || formatType === 'tutorial') score += 3;
  
  return Math.min(Math.round(score), 100);
}

// ============================================================================
// PACING & EDITING ANALYSIS
// ============================================================================

function analyzePacing(duration?: number, formatType?: FormatType): string {
  if (formatType === 'tutorial' || formatType === 'storytime') return 'Moderate pace (5-7s segments)';
  if (formatType === 'aesthetic') return 'Slow cinematic pace';
  if (duration && duration < 15) return 'Very fast (1-2s cuts)';
  if (duration && duration < 30) return 'Fast-paced (2-3s cuts)';
  return 'TikTok standard (2-4s cuts)';
}

function detectIntroType(title: string, formatType: FormatType): string {
  if (formatType === 'pov') return 'POV Scenario Setup';
  if (formatType === 'tutorial') return 'Promise/Outcome Hook';
  if (formatType === 'transformation') return 'Before State Reveal';
  if (formatType === 'challenge') return 'Challenge Introduction';
  if (formatType === 'storytime') return 'Story Setup';
  return 'Visual Hook';
}

function determineEditingStyle(formatType: FormatType): string {
  switch (formatType) {
    case 'pov': return 'Immersive first-person';
    case 'transformation': return 'Before/After split or transition';
    case 'tutorial': return 'Step-by-step progression';
    case 'meme': return 'Jump cuts & reaction inserts';
    case 'aesthetic': return 'Smooth transitions & color grading';
    case 'challenge': return 'Quick cuts & sync to beat';
    default: return 'Standard TikTok editing';
  }
}

function analyzeCaptionStructure(title: string, description: string = ''): string {
  const combined = `${title} ${description}`;
  const emojiCount = (combined.match(/[\p{Emoji}]/gu) || []).length;
  const length = combined.length;
  
  let structure = length < 50 ? 'Short & punchy' : length < 100 ? 'Medium length' : 'Long descriptive';
  
  if (emojiCount > 5) structure += ', heavy emoji';
  else if (emojiCount > 2) structure += ', moderate emoji';
  else if (emojiCount === 0) structure += ', no emoji';
  
  const hashtagCount = (combined.match(/#/g) || []).length;
  if (hashtagCount > 5) structure += ', hashtag-heavy';
  else if (hashtagCount > 0) structure += ', includes hashtags';
  
  return structure;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

function analyzeTrend(rawPayload: any): AnalyzedTrend {
  const title = (rawPayload.title || '').slice(0, 200);
  const description = rawPayload.description || '';
  const hashtags = rawPayload.hashtags || [];
  const platform = rawPayload.platform || 'tiktok';
  const duration = parseNumericValue(rawPayload.duration);
  
  const format_type = classifyFormat(title, description, hashtags);
  const hook_style = analyzeHookStyle(title, description);
  const trend_score = calculateViralScore(
    rawPayload.views,
    rawPayload.likes,
    rawPayload.shares,
    rawPayload.comments,
    duration,
    format_type
  );
  
  return {
    title,
    description,
    platform,
    source_url: rawPayload.source_url || '',
    format_type,
    hook_style,
    trend_score,
    avg_duration: duration || undefined,
    duration_range_min: duration ? Math.max(duration - 10, 5) : undefined,
    duration_range_max: duration ? duration + 15 : undefined,
    audio_name: rawPayload.audio_name,
    intro_type: detectIntroType(title, format_type),
    pacing_pattern: analyzePacing(duration, format_type),
    editing_style: determineEditingStyle(format_type),
    caption_structure: analyzeCaptionStructure(title, description),
    hashtags,
    views: parseNumericValue(rawPayload.views),
    likes: parseNumericValue(rawPayload.likes),
    shares: parseNumericValue(rawPayload.shares),
    comments: parseNumericValue(rawPayload.comments),
  };
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Analysis Worker] Starting trend analysis...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch unprocessed raw trends (TikTok only for now)
    const { data: rawTrends, error: fetchError } = await supabase
      .from('trend_raw_data')
      .select('*')
      .eq('processed', false)
      .order('scraped_at', { ascending: false })
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`[Analysis Worker] Found ${rawTrends?.length || 0} unprocessed trends`);

    let processed = 0;
    let errors = 0;

    for (const raw of rawTrends || []) {
      try {
        const analyzed = analyzeTrend(raw.raw_payload);
        
        // Skip if no URL
        if (!analyzed.source_url) {
          await supabase.from('trend_raw_data').update({ processed: true, error: 'No source URL' }).eq('id', raw.id);
          continue;
        }
        
        // Check for duplicates
        const { data: existing } = await supabase
          .from('trends_v2')
          .select('id')
          .eq('source_url', analyzed.source_url)
          .maybeSingle();

        if (existing) {
          await supabase.from('trend_raw_data').update({ processed: true, processed_trend_id: existing.id }).eq('id', raw.id);
          continue;
        }
        
        console.log(`[Analysis Worker] Processing: "${analyzed.title.slice(0, 50)}..." Score: ${analyzed.trend_score}`);

        // Insert into trends_v2
        const { data: trend, error: insertError } = await supabase
          .from('trends_v2')
          .insert({
            title: analyzed.title,
            description: analyzed.description,
            platform: analyzed.platform,
            source_url: analyzed.source_url,
            trend_score: analyzed.trend_score,
            format_type: analyzed.format_type,
            hook_style: analyzed.hook_style,
            avg_duration: analyzed.avg_duration,
            duration_range_min: analyzed.duration_range_min,
            duration_range_max: analyzed.duration_range_max,
            audio_name: analyzed.audio_name,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Store pattern data
        await supabase.from('trend_patterns').insert({
          trend_id: trend.id,
          intro_type: analyzed.intro_type,
          pacing_pattern: analyzed.pacing_pattern,
          editing_style: analyzed.editing_style,
          caption_structure: analyzed.caption_structure,
        });

        // Store hashtags (limit to 10)
        if (analyzed.hashtags?.length > 0) {
          const hashtagInserts = analyzed.hashtags.slice(0, 10).map((tag: string) => ({
            trend_id: trend.id,
            hashtag: tag,
            frequency_score: 1,
          }));
          await supabase.from('trend_hashtags').insert(hashtagInserts);
        }

        // Store metrics
        await supabase.from('trend_metrics').insert({
          trend_id: trend.id,
          views: analyzed.views || 0,
          likes: analyzed.likes || 0,
          shares: analyzed.shares || 0,
          comments: analyzed.comments || 0,
          engagement_rate: analyzed.views && analyzed.views > 0
            ? ((analyzed.likes || 0) / analyzed.views * 100)
            : 0,
        });

        // Mark raw data as processed
        await supabase.from('trend_raw_data').update({ processed: true, processed_trend_id: trend.id }).eq('id', raw.id);

        processed++;
      } catch (err: any) {
        console.error(`[Analysis Worker] Failed to process ${raw.id}:`, err.message);
        await supabase.from('trend_raw_data').update({ processed: true, error: err.message }).eq('id', raw.id);
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Analysis Worker] Completed in ${duration}ms. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: rawTrends?.length || 0, duration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Analysis Worker] Fatal error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
