--file-text "-- Trend Intelligence Platform - Production Schema
-- Migration: Add trend analysis tables

-- ============================================================================
-- TRENDS TABLE - Core trend data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trends_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'facebook')),
  source_url TEXT NOT NULL,
  trend_score INTEGER DEFAULT 0,
  format_type TEXT CHECK (format_type IN ('pov', 'transformation', 'tutorial', 'meme', 'storytime', 'relatable', 'aesthetic', 'challenge', 'other')),
  avg_duration INTEGER, -- seconds
  duration_range_min INTEGER,
  duration_range_max INTEGER,
  hook_style TEXT,
  audio_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trends_v2_platform ON public.trends_v2(platform);
CREATE INDEX idx_trends_v2_trend_score ON public.trends_v2(trend_score DESC);
CREATE INDEX idx_trends_v2_format_type ON public.trends_v2(format_type);
CREATE INDEX idx_trends_v2_is_active ON public.trends_v2(is_active);

-- ============================================================================
-- TREND METRICS - Engagement data over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  views BIGINT,
  likes BIGINT,
  shares INTEGER,
  comments INTEGER,
  engagement_rate DECIMAL(5,2), -- percentage
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_metrics_trend_id ON public.trend_metrics(trend_id);
CREATE INDEX idx_trend_metrics_collected_at ON public.trend_metrics(collected_at DESC);

-- ============================================================================
-- TREND PATTERNS - Structural analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  intro_type TEXT, -- 'fast_hook', 'zoom_in', 'text_overlay', 'face_cam', etc.
  pacing_pattern TEXT, -- 'fast_cuts', 'medium_pace', 'slow_narrative'
  editing_style TEXT,
  caption_structure TEXT,
  text_overlay_frequency TEXT, -- 'heavy', 'moderate', 'minimal', 'none'
  transition_style TEXT,
  color_grading TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_patterns_trend_id ON public.trend_patterns(trend_id);

-- ============================================================================
-- TREND HASHTAGS - Many-to-many relationship
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  frequency_score INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_hashtags_trend_id ON public.trend_hashtags(trend_id);
CREATE INDEX idx_trend_hashtags_hashtag ON public.trend_hashtags(hashtag);

-- ============================================================================
-- TREND RAW DATA - Scraping results before processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trend_raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- aggregator site name
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_trend_id UUID REFERENCES public.trends_v2(id),
  error TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_raw_data_processed ON public.trend_raw_data(processed);
CREATE INDEX idx_trend_raw_data_source ON public.trend_raw_data(source);

-- ============================================================================
-- SCRAPER STATUS - Track scraper health
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scraper_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name TEXT NOT NULL UNIQUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  last_error TEXT,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY - Trends are public read
-- ============================================================================

ALTER TABLE public.trends_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"Trends are viewable by authenticated users\" ON public.trends_v2
  FOR SELECT TO authenticated USING (is_active = true);

ALTER TABLE public.trend_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"Metrics are viewable by authenticated users\" ON public.trend_metrics
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.trend_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"Patterns are viewable by authenticated users\" ON public.trend_patterns
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.trend_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"Hashtags are viewable by authenticated users\" ON public.trend_hashtags
  FOR SELECT TO authenticated USING (true);

-- Only service role can write to these tables
CREATE POLICY \"Service role can manage trends\" ON public.trends_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY \"Service role can manage metrics\" ON public.trend_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY \"Service role can manage patterns\" ON public.trend_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY \"Service role can manage hashtags\" ON public.trend_hashtags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trends_v2_updated_at BEFORE UPDATE ON public.trends_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate trend score based on metrics
CREATE OR REPLACE FUNCTION calculate_trend_score(trend_id UUID)
RETURNS INTEGER AS $$
DECLARE
    latest_metrics RECORD;
    score INTEGER;
BEGIN
    -- Get most recent metrics
    SELECT views, likes, shares, comments
    INTO latest_metrics
    FROM public.trend_metrics
    WHERE trend_metrics.trend_id = calculate_trend_score.trend_id
    ORDER BY collected_at DESC
    LIMIT 1;
    
    IF latest_metrics IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Score formula: weighted engagement
    score := COALESCE(
        (latest_metrics.views / 1000)::INTEGER + 
        (latest_metrics.likes / 10)::INTEGER * 2 + 
        (latest_metrics.shares)::INTEGER * 5 +
        (latest_metrics.comments)::INTEGER * 3,
        0
    );
    
    RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;
"
