-- ============================================================================
-- TREND INTELLIGENCE PLATFORM - PRODUCTION SCHEMA
-- ============================================================================

-- Create platform enum type for trends_v2
DO $$ BEGIN
  CREATE TYPE trend_platform AS ENUM ('tiktok', 'instagram', 'youtube', 'twitter', 'facebook');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create format type enum
DO $$ BEGIN
  CREATE TYPE trend_format_type AS ENUM ('pov', 'transformation', 'tutorial', 'meme', 'storytime', 'relatable', 'aesthetic', 'challenge', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: trends_v2 - Core trend intelligence data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trends_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  platform trend_platform NOT NULL,
  source_url TEXT NOT NULL,
  trend_score INTEGER NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  format_type trend_format_type,
  avg_duration INTEGER,
  duration_range_min INTEGER,
  duration_range_max INTEGER,
  hook_style TEXT,
  audio_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for trends_v2
CREATE INDEX IF NOT EXISTS idx_trends_v2_platform ON public.trends_v2(platform);
CREATE INDEX IF NOT EXISTS idx_trends_v2_format_type ON public.trends_v2(format_type);
CREATE INDEX IF NOT EXISTS idx_trends_v2_trend_score ON public.trends_v2(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_trends_v2_is_active ON public.trends_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_trends_v2_created_at ON public.trends_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_v2_active_score ON public.trends_v2(is_active, trend_score DESC) WHERE is_active = true;

-- ============================================================================
-- TABLE: trend_metrics - Engagement tracking over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for trend_metrics
CREATE INDEX IF NOT EXISTS idx_trend_metrics_trend_id ON public.trend_metrics(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_metrics_collected_at ON public.trend_metrics(collected_at DESC);

-- ============================================================================
-- TABLE: trend_patterns - Structural analysis (intro, pacing, editing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  intro_type TEXT,
  pacing_pattern TEXT,
  editing_style TEXT,
  caption_structure TEXT,
  text_overlay_frequency TEXT,
  transition_style TEXT,
  color_grading TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for trend_patterns
CREATE INDEX IF NOT EXISTS idx_trend_patterns_trend_id ON public.trend_patterns(trend_id);

-- ============================================================================
-- TABLE: trend_hashtags - Hashtag relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  frequency_score INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for trend_hashtags
CREATE INDEX IF NOT EXISTS idx_trend_hashtags_trend_id ON public.trend_hashtags(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_hashtags_hashtag ON public.trend_hashtags(hashtag);

-- ============================================================================
-- TABLE: trend_raw_data - Raw scraper results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_trend_id UUID REFERENCES public.trends_v2(id) ON DELETE SET NULL,
  error TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for trend_raw_data
CREATE INDEX IF NOT EXISTS idx_trend_raw_data_processed ON public.trend_raw_data(processed);
CREATE INDEX IF NOT EXISTS idx_trend_raw_data_source ON public.trend_raw_data(source);
CREATE INDEX IF NOT EXISTS idx_trend_raw_data_scraped_at ON public.trend_raw_data(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_raw_data_unprocessed ON public.trend_raw_data(processed, scraped_at DESC) WHERE processed = false;

-- ============================================================================
-- TABLE: scraper_status - Scraper health monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scraper_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name TEXT NOT NULL UNIQUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_successes INTEGER NOT NULL DEFAULT 0,
  total_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for scraper_status
CREATE INDEX IF NOT EXISTS idx_scraper_status_name ON public.scraper_status(scraper_name);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_trends_v2_updated_at ON public.trends_v2;
CREATE TRIGGER update_trends_v2_updated_at
  BEFORE UPDATE ON public.trends_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scraper_status_updated_at ON public.scraper_status;
CREATE TRIGGER update_scraper_status_updated_at
  BEFORE UPDATE ON public.scraper_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.trends_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_status ENABLE ROW LEVEL SECURITY;

-- trends_v2: Public read for active trends, service role for writes
CREATE POLICY "Anyone can view active trends"
  ON public.trends_v2 FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage all trends"
  ON public.trends_v2 FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- trend_metrics: Public read, service role for writes
CREATE POLICY "Anyone can view trend metrics"
  ON public.trend_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage trend metrics"
  ON public.trend_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- trend_patterns: Public read, service role for writes
CREATE POLICY "Anyone can view trend patterns"
  ON public.trend_patterns FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage trend patterns"
  ON public.trend_patterns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- trend_hashtags: Public read, service role for writes
CREATE POLICY "Anyone can view trend hashtags"
  ON public.trend_hashtags FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage trend hashtags"
  ON public.trend_hashtags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- trend_raw_data: Service role only (internal use)
CREATE POLICY "Service role can manage raw data"
  ON public.trend_raw_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- scraper_status: Public read, service role for writes
CREATE POLICY "Anyone can view scraper status"
  ON public.scraper_status FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage scraper status"
  ON public.scraper_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SEED DATA: Initialize scraper status entries
-- ============================================================================
INSERT INTO public.scraper_status (scraper_name, is_enabled)
VALUES 
  ('tiktok_creative_center', true),
  ('instagram_rapidapi', true),
  ('youtube_trending', true)
ON CONFLICT (scraper_name) DO NOTHING;