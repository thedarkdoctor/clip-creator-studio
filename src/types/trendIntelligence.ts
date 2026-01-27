"/**
 * Trend Intelligence Platform Types
 * 
 * Generated from trend_intelligence_schema.sql
 */

export interface TrendV2 {
  id: string;
  title: string;
  description: string | null;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook';
  source_url: string;
  trend_score: number;
  format_type: 'pov' | 'transformation' | 'tutorial' | 'meme' | 'storytime' | 'relatable' | 'aesthetic' | 'challenge' | 'other' | null;
  avg_duration: number | null;
  duration_range_min: number | null;
  duration_range_max: number | null;
  hook_style: string | null;
  audio_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrendMetrics {
  id: string;
  trend_id: string;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  engagement_rate: number | null;
  collected_at: string;
}

export interface TrendPattern {
  id: string;
  trend_id: string;
  intro_type: string | null;
  pacing_pattern: string | null;
  editing_style: string | null;
  caption_structure: string | null;
  text_overlay_frequency: string | null;
  transition_style: string | null;
  color_grading: string | null;
  created_at: string;
}

export interface TrendHashtag {
  id: string;
  trend_id: string;
  hashtag: string;
  frequency_score: number;
  created_at: string;
}

export interface TrendRawData {
  id: string;
  source: string;
  raw_payload: any;
  processed: boolean;
  processed_trend_id: string | null;
  error: string | null;
  scraped_at: string;
}

export interface ScraperStatus {
  id: string;
  scraper_name: string;
  last_run_at: string | null;
  last_success_at: string | null;
  total_runs: number;
  total_successes: number;
  total_failures: number;
  last_error: string | null;
  is_enabled: boolean;
  updated_at: string;
}

// Enhanced trend with all related data
export interface EnhancedTrend extends TrendV2 {
  metrics?: TrendMetrics;
  pattern?: TrendPattern;
  hashtags?: TrendHashtag[];
}
"
