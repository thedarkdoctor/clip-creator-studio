"/**
 * Trend Analysis Engine
 * 
 * Analyzes raw scraped trends to extract:
 * - Format classification (POV, Tutorial, Meme, etc.)
 * - Hook styles
 * - Pacing patterns
 * - Structural patterns
 * - Viral scoring
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

type FormatType = 'pov' | 'transformation' | 'tutorial' | 'meme' | 'storytime' | 'relatable' | 'aesthetic' | 'challenge' | 'other';

interface AnalyzedTrend {
  // Core data
  title: string;
  description?: string;
  platform: string;
  source_url: string;
  
  // Classification
  format_type: FormatType;
  hook_style: string;
  
  // Metrics
  trend_score: number;
  
  // Duration
  avg_duration?: number;
  duration_range_min?: number;
  duration_range_max?: number;
  
  // Audio
  audio_name?: string;
  
  // Patterns
  intro_type?: string;
  pacing_pattern?: string;
  editing_style?: string;
  caption_structure?: string;
  
  // Hashtags
  hashtags: string[];
  
  // Engagement
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
}

// ============================================================================
// FORMAT CLASSIFICATION
// ============================================================================

function classifyFormat(title: string, description: string = '', hashtags: string[] = []): FormatType {
  const combined = `${title} ${description}`.toLowerCase();
  const hashtagStr = hashtags.join(' ').toLowerCase();
  
  // POV
  if (combined.includes('pov') || combined.startsWith('pov:')) {
    return 'pov';
  }
  
  // Transformation
  if (combined.includes('before') && combined.includes('after') ||
      combined.includes('transformation') ||
      combined.includes('glow up') ||
      hashtagStr.includes('beforeandafter')) {
    return 'transformation';
  }
  
  // Tutorial
  if (combined.includes('how to') ||
      combined.includes('tutorial') ||
      combined.includes('step by step') ||
      /\d+\s+(ways?|tips?|steps?|hacks?)/.test(combined)) {
    return 'tutorial';
  }
  
  // Meme
  if (combined.includes('when ') ||
      combined.includes('meme') ||
      combined.includes('literally me') ||
      hashtagStr.includes('#meme')) {
    return 'meme';
  }
  
  // Storytime
  if (combined.includes('story time') ||
      combined.includes('storytime') ||
      combined.includes('time i ') ||
      combined.includes('remember when')) {
    return 'storytime';
  }
  
  // Relatable
  if (combined.includes('relatable') ||
      combined.includes('anyone else') ||
      combined.includes('is it just me') ||
      hashtagStr.includes('#relatable')) {
    return 'relatable';
  }
  
  // Aesthetic
  if (combined.includes('aesthetic') ||
      combined.includes('montage') ||
      combined.includes('vibe') ||
      hashtagStr.includes('#aesthetic')) {
    return 'aesthetic';
  }
  
  // Challenge
  if (combined.includes('challenge') ||
      hashtagStr.includes('#challenge')) {
    return 'challenge';
  }
  
  return 'other';
}

// ============================================================================
// HOOK ANALYSIS
// ============================================================================

function analyzeHookStyle(title: string, description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  const firstWords = title.toLowerCase().split(' ').slice(0, 5).join(' ');
  
  // POV hook
  if (firstWords.startsWith('pov')) {
    return 'POV Storytelling';
  }
  
  // Question hook
  if (firstWords.includes('?') || firstWords.startsWith('how ') || firstWords.startsWith('why ')) {
    return 'Question Hook';
  }
  
  // Number hook
  if (/^\d+/.test(firstWords)) {
    return 'Numbered List';
  }
  
  // Command/Call to action
  if (firstWords.startsWith('watch') || firstWords.startsWith('wait') || firstWords.startsWith('see')) {
    return 'Call to Action';
  }
  
  // Shock/Surprise
  if (text.includes('!!') || text.includes('😱') || text.includes('🤯') ||
      firstWords.includes('you won\'t believe') || firstWords.includes('shocking')) {
    return 'Shock Hook';
  }
  
  // Urgent
  if (text.includes('must') || text.includes('need to') || text.includes('secret') ||
      text.includes('🔥') || text.includes('⚠️')) {
    return 'Urgent/Secret';
  }
  
  return 'Direct Statement';
}

// ============================================================================
// PACING ANALYSIS
// ============================================================================

function analyzePacing(platform: string, duration?: number, formatType?: FormatType): string {
  // TikTok tends to be faster
  if (platform === 'tiktok') {
    return 'Fast-paced (2-3s cuts)';
  }
  
  // Tutorial format tends to be slower
  if (formatType === 'tutorial' || formatType === 'storytime') {
    return 'Moderate pace (5-7s segments)';
  }
  
  // Short duration = fast cuts
  if (duration && duration < 20) {
    return 'Very fast (1-2s cuts)';
  }
  
  if (duration && duration < 35) {
    return 'Fast-paced (2-4s cuts)';
  }
  
  return 'Medium pace (4-6s cuts)';
}

// ============================================================================
// INTRO TYPE DETECTION
// ============================================================================

function detectIntroType(title: string, formatType: FormatType): string {
  const titleLower = title.toLowerCase();
  
  // POV usually starts with scenario
  if (formatType === 'pov') {
    return 'POV Scenario Setup';
  }
  
  // Tutorial starts with promise/outcome
  if (formatType === 'tutorial') {
    return 'Promise/Outcome Hook';
  }
  
  // Transformation shows before state
  if (formatType === 'transformation') {
    return 'Before State Reveal';
  }
  
  // Check for text overlay indicators
  if (titleLower.includes('text') || titleLower.includes('caption')) {
    return 'Text Overlay Hook';
  }
  
  return 'Visual Hook';
}

// ============================================================================
// CAPTION STRUCTURE ANALYSIS
// ============================================================================

function analyzeCaptionStructure(title: string, description: string = ''): string {
  const combined = `${title} ${description}`;
  const emojiCount = (combined.match(/[\p{Emoji}]/gu) || []).length;
  const length = combined.length;
  
  let structure = '';
  
  // Length
  if (length < 50) {
    structure = 'Short & punchy';
  } else if (length < 100) {
    structure = 'Medium length';
  } else {
    structure = 'Long descriptive';
  }
  
  // Emoji usage
  if (emojiCount > 5) {
    structure += ', heavy emoji';
  } else if (emojiCount > 2) {
    structure += ', moderate emoji';
  } else if (emojiCount === 0) {
    structure += ', no emoji';
  }
  
  // Hashtags
  const hashtagCount = (combined.match(/#/g) || []).length;
  if (hashtagCount > 5) {
    structure += ', hashtag-heavy';
  } else if (hashtagCount > 0) {
    structure += ', includes hashtags';
  }
  
  return structure;
}

// ============================================================================
// VIRAL SCORE CALCULATION
// ============================================================================

function calculateViralScore(
  views: number = 0,
  likes: number = 0,
  shares: number = 0,
  comments: number = 0,
  platform: string
): number {
  // Platform-specific baselines
  const platformMultiplier: Record<string, number> = {
    tiktok: 1.0,
    instagram: 1.2,
    youtube: 1.5,
    twitter: 0.8,
    facebook: 0.7,
  };
  
  const multiplier = platformMultiplier[platform] || 1.0;
  
  // Weighted scoring
  const score = (
    (views / 10000) +         // 1 point per 10k views
    (likes / 100) * 2 +       // 2 points per 100 likes
    (shares * 5) +            // 5 points per share
    (comments * 3)            // 3 points per comment
  ) * multiplier;
  
  // Cap at 100
  return Math.min(Math.round(score), 100);
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export async function analyzeTrend(rawData: any): Promise<AnalyzedTrend> {
  console.log('[Analysis] Analyzing trend:', rawData.title);
  
  const title = rawData.title || '';
  const description = rawData.description || '';
  const hashtags = rawData.hashtags || [];
  const platform = rawData.platform;
  
  // Classify format
  const format_type = classifyFormat(title, description, hashtags);
  
  // Analyze hook
  const hook_style = analyzeHookStyle(title, description);
  
  // Calculate score
  const trend_score = calculateViralScore(
    rawData.views,
    rawData.likes,
    rawData.shares,
    rawData.comments,
    platform
  );
  
  // Analyze pacing
  const pacing_pattern = analyzePacing(platform, rawData.duration, format_type);
  
  // Detect intro type
  const intro_type = detectIntroType(title, format_type);
  
  // Analyze caption structure
  const caption_structure = analyzeCaptionStructure(title, description);
  
  // Determine editing style based on platform and format
  let editing_style = 'Standard cuts';
  if (platform === 'tiktok' || format_type === 'meme') {
    editing_style = 'Jump cuts & transitions';
  } else if (format_type === 'aesthetic') {
    editing_style = 'Smooth transitions';
  } else if (format_type === 'tutorial') {
    editing_style = 'Step-by-step progression';
  }
  
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

// ============================================================================
// PROCESS RAW TRENDS
// ============================================================================

export async function processRawTrends(limit: number = 50): Promise<number> {
  console.log(`[Analysis] Processing up to ${limit} raw trends...`);
  
  // Fetch unprocessed raw trends
  const { data: rawTrends, error } = await supabase
    .from('trend_raw_data')
    .select('*')
    .eq('processed', false)
    .limit(limit);

  if (error || !rawTrends) {
    console.error('[Analysis] Failed to fetch raw trends:', error);
    return 0;
  }

  console.log(`[Analysis] Found ${rawTrends.length} unprocessed trends`);
  let processedCount = 0;

  for (const raw of rawTrends) {
    try {
      // Analyze the trend
      const analyzed = await analyzeTrend(raw.raw_payload);
      
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
        throw trendError;
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
        .update({
          processed: true,
          processed_trend_id: trend.id,
        })
        .eq('id', raw.id);

      processedCount++;
      console.log(`[Analysis] Processed: ${analyzed.title} (Score: ${analyzed.trend_score})`);
      
    } catch (error: any) {
      console.error(`[Analysis] Failed to process trend ${raw.id}:`, error);
      
      // Mark as processed with error
      await supabase
        .from('trend_raw_data')
        .update({
          processed: true,
          error: error.message,
        })
        .eq('id', raw.id);
    }
  }

  console.log(`[Analysis] Processing complete: ${processedCount}/${rawTrends.length} successful`);
  return processedCount;
}
"
