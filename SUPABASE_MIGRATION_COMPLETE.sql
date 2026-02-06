-- ============================================================================
-- CLIPLYST - COMPLETE SUPABASE MIGRATION SCRIPT
-- ============================================================================
-- Execute these migrations IN ORDER on your new Supabase project
-- New Supabase URL: https://zlzbdepkptwgalfdkdpr.supabase.co
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Initial Schema - Users, Platforms, Videos, Clips, Trends
-- Source: 20260125164455_880a8cc6-6746-4db3-a3de-b4e0fa67291d.sql
-- ============================================================================

-- 1. Create users table (extended profile data)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT,
  niche TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 2. Create platforms table
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on platforms (authenticated users can read)
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view platforms" ON public.platforms
  FOR SELECT TO authenticated USING (true);

-- Seed platforms
INSERT INTO public.platforms (name) VALUES 
  ('TikTok'),
  ('Instagram Reels'),
  ('YouTube Shorts');

-- 3. Create user_platforms join table
CREATE TABLE public.user_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_id)
);

-- Enable RLS on user_platforms
ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platforms" ON public.user_platforms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add own platforms" ON public.user_platforms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own platforms" ON public.user_platforms
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create trends table
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  engagement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trends (authenticated users can read active trends)
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active trends" ON public.trends
  FOR SELECT TO authenticated USING (is_active = true);

-- Seed trends with platform references
INSERT INTO public.trends (platform_id, title, description, engagement) VALUES
  ((SELECT id FROM public.platforms WHERE name = 'TikTok'), 'Quick Tutorial Format', 'Fast-paced how-to content with text overlays and trending sounds', '2.3M avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'TikTok'), 'POV Storytelling', 'First-person perspective narratives with emotional hooks', '3.1M avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'TikTok'), 'Duet Response', 'React and respond to trending content in your niche', '1.9M avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'Instagram Reels'), 'Before & After Reveal', 'Transformation content with satisfying transitions', '1.8M avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'Instagram Reels'), 'Carousel Breakdown', 'Educational slides with key takeaways and actionable tips', '1.2M avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'Instagram Reels'), 'Behind The Scenes', 'Authentic glimpses into your process or daily routine', '980K avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'YouTube Shorts'), 'Hook & Story Arc', 'Strong opening hook with narrative storytelling structure', '890K avg views'),
  ((SELECT id FROM public.platforms WHERE name = 'YouTube Shorts'), 'Challenge Format', 'Engaging challenge content with community participation', '2.5M avg views');

-- 5. Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create generated_clips table
CREATE TABLE public.generated_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on generated_clips
ALTER TABLE public.generated_clips ENABLE ROW LEVEL SECURITY;

-- Users can view clips for their own videos
CREATE POLICY "Users can view own clips" ON public.generated_clips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE videos.id = generated_clips.video_id 
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create clips for own videos" ON public.generated_clips
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE videos.id = generated_clips.video_id 
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own clips" ON public.generated_clips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE videos.id = generated_clips.video_id 
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own clips" ON public.generated_clips
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE videos.id = generated_clips.video_id 
      AND videos.user_id = auth.uid()
    )
  );

-- 7. Create user_trends table to track selected trends
CREATE TABLE public.user_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trend_id)
);

-- Enable RLS on user_trends
ALTER TABLE public.user_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trends" ON public.user_trends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add own trends" ON public.user_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trends" ON public.user_trends
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- MIGRATION 2: Trend Intelligence Platform Schema
-- Source: 20250126000000_trend_intelligence_schema.sql
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

-- TRENDS_V2 TABLE - Core trend data
CREATE TABLE IF NOT EXISTS public.trends_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  platform trend_platform NOT NULL,
  source_url TEXT NOT NULL,
  trend_score INTEGER DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  format_type trend_format_type,
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
CREATE INDEX idx_trends_v2_created_at ON public.trends_v2(created_at DESC);
CREATE INDEX idx_trends_v2_active_score ON public.trends_v2(is_active, trend_score DESC) WHERE is_active = true;

-- TREND METRICS - Engagement data over time
CREATE TABLE IF NOT EXISTS public.trend_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- percentage
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_metrics_trend_id ON public.trend_metrics(trend_id);
CREATE INDEX idx_trend_metrics_collected_at ON public.trend_metrics(collected_at DESC);

-- TREND PATTERNS - Structural analysis
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

-- TREND HASHTAGS - Many-to-many relationship
CREATE TABLE IF NOT EXISTS public.trend_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends_v2(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  frequency_score INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_hashtags_trend_id ON public.trend_hashtags(trend_id);
CREATE INDEX idx_trend_hashtags_hashtag ON public.trend_hashtags(hashtag);

-- TREND RAW DATA - Scraping results before processing
CREATE TABLE IF NOT EXISTS public.trend_raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- aggregator site name
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_trend_id UUID REFERENCES public.trends_v2(id) ON DELETE SET NULL,
  error TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trend_raw_data_processed ON public.trend_raw_data(processed);
CREATE INDEX idx_trend_raw_data_source ON public.trend_raw_data(source);
CREATE INDEX idx_trend_raw_data_scraped_at ON public.trend_raw_data(scraped_at DESC);
CREATE INDEX idx_trend_raw_data_unprocessed ON public.trend_raw_data(processed, scraped_at DESC) WHERE processed = false;

-- SCRAPER STATUS - Track scraper health
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

CREATE INDEX idx_scraper_status_name ON public.scraper_status(scraper_name);

-- ROW LEVEL SECURITY - Trends are public read
ALTER TABLE public.trends_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active trends v2" ON public.trends_v2
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage trends v2" ON public.trends_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.trend_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view metrics" ON public.trend_metrics
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage metrics" ON public.trend_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.trend_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view patterns" ON public.trend_patterns
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage patterns" ON public.trend_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.trend_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view hashtags" ON public.trend_hashtags
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage hashtags" ON public.trend_hashtags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.trend_raw_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage raw data" ON public.trend_raw_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.scraper_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scraper status" ON public.scraper_status
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage scraper status" ON public.scraper_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- FUNCTIONS & TRIGGERS
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trends_v2_updated_at BEFORE UPDATE ON public.trends_v2
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scraper_status_updated_at BEFORE UPDATE ON public.scraper_status
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

-- Seed scraper status entries
INSERT INTO public.scraper_status (scraper_name, is_enabled)
VALUES 
  ('tiktok_creative_center', true),
  ('instagram_rapidapi', true),
  ('youtube_trending', true)
ON CONFLICT (scraper_name) DO NOTHING;


-- ============================================================================
-- MIGRATION 3: MVP Features - Media, Buffer, Storage
-- Source: 20260126000000_add_mvp_features.sql
-- ============================================================================

-- 1. Add media fields to trends table
ALTER TABLE public.trends 
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('video', 'image', NULL)),
  ADD COLUMN IF NOT EXISTS embed_url TEXT,
  ADD COLUMN IF NOT EXISTS views BIGINT,
  ADD COLUMN IF NOT EXISTS likes BIGINT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMP WITH TIME ZONE;

-- 2. Add storage path to videos table
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 3. Add storage path and metadata to generated_clips table
ALTER TABLE public.generated_clips
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS start_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS end_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS font_style JSONB,
  ADD COLUMN IF NOT EXISTS background_music_url TEXT,
  ADD COLUMN IF NOT EXISTS additional_media_urls JSONB;

-- 4. Add more platforms (Facebook, Twitter/X)
INSERT INTO public.platforms (name) VALUES 
  ('Facebook'),
  ('Twitter/X')
ON CONFLICT (name) DO NOTHING;

-- 5. Create buffer_posts table for scheduled posts
CREATE TABLE IF NOT EXISTS public.buffer_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES public.generated_clips(id) ON DELETE CASCADE,
  buffer_post_id TEXT, -- Buffer API post ID
  platform TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'published', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on buffer_posts
ALTER TABLE public.buffer_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own buffer posts
CREATE POLICY "Users can view own buffer posts" ON public.buffer_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generated_clips gc
      JOIN public.videos v ON v.id = gc.video_id
      WHERE gc.id = buffer_posts.clip_id
      AND v.user_id = auth.uid()
    )
  );

-- Users can create buffer posts for their own clips
CREATE POLICY "Users can create own buffer posts" ON public.buffer_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_clips gc
      JOIN public.videos v ON v.id = gc.video_id
      WHERE gc.id = buffer_posts.clip_id
      AND v.user_id = auth.uid()
    )
  );

-- Users can update their own buffer posts (only if not published)
CREATE POLICY "Users can update own buffer posts" ON public.buffer_posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.generated_clips gc
      JOIN public.videos v ON v.id = gc.video_id
      WHERE gc.id = buffer_posts.clip_id
      AND v.user_id = auth.uid()
    )
    AND status != 'published'
  );

-- Users can delete their own buffer posts (only if not published)
CREATE POLICY "Users can delete own buffer posts" ON public.buffer_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.generated_clips gc
      JOIN public.videos v ON v.id = gc.video_id
      WHERE gc.id = buffer_posts.clip_id
      AND v.user_id = auth.uid()
    )
    AND status != 'published'
  );

-- 6. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_buffer_posts_scheduled_at ON public.buffer_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_buffer_posts_status ON public.buffer_posts(status);
CREATE INDEX IF NOT EXISTS idx_trends_discovered_at ON public.trends(discovered_at);
CREATE INDEX IF NOT EXISTS idx_trends_platform_active ON public.trends(platform_id, is_active);


-- ============================================================================
-- MIGRATION 4: Storage Policies for Videos Bucket
-- Source: 20260126070026_87670d05-342d-4126-89ea-c37ebb5dd7bd.sql
-- ============================================================================

-- Note: Storage bucket must be created first via Supabase Dashboard
-- This migration only creates the policies

-- Drop existing storage policies that might conflict
DROP POLICY IF EXISTS "Users can view own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;

-- Recreate storage policies for the videos bucket
-- Allow authenticated users to upload videos to their own folder (user_id/filename)
CREATE POLICY "Users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own videos
CREATE POLICY "Users can view own videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own videos
CREATE POLICY "Users can update own videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================================================
-- MIGRATION 5: Connected Social Accounts
-- Source: 20260201000000_connected_social_accounts.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS connected_social_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    provider text NOT NULL CHECK (provider = 'buffer'),
    buffer_access_token text NOT NULL, -- ENCRYPTED
    buffer_refresh_token text,
    buffer_profile_id text NOT NULL,
    buffer_profile_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_connected_social_accounts_user_id ON connected_social_accounts(user_id);


-- ============================================================================
-- MIGRATION 6: Post Schedules
-- Source: 20260201000001_post_schedules.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    next_post_at timestamptz NOT NULL,
    auto_mode boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    scheduled_for timestamptz NOT NULL,
    buffer_status text NOT NULL DEFAULT 'pending' CHECK (buffer_status IN ('pending', 'sent', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_schedules_user_id ON post_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_buffer_status ON scheduled_posts(buffer_status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);


-- ============================================================================
-- MIGRATION 7: Content Jobs (Lynkscope Integration)
-- Source: 20260201000002_content_jobs.sql & 20260202133426_6121ada9-d9c1-4c5a-8dbd-3a1eaa94e1a5.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  weak_platforms TEXT[] DEFAULT '{}',
  top_opportunities TEXT[] DEFAULT '{}',
  auto_schedule BOOLEAN DEFAULT false,
  posting_frequency TEXT DEFAULT 'weekly',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  error_message TEXT,
  progress JSONB DEFAULT '{"trends_discovered": 0, "scripts_generated": 0, "videos_created": 0, "scheduled": 0}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions use service role)
CREATE POLICY "Service role can manage all jobs"
ON public.content_jobs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_content_jobs_updated_at
BEFORE UPDATE ON public.content_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_jobs_status ON public.content_jobs(status);
CREATE INDEX IF NOT EXISTS idx_content_jobs_user_id ON public.content_jobs(user_id);


-- ============================================================================
-- MIGRATION 8: Marketing Intelligence (Lynkscope Analytics)
-- Source: 20260204015407_4aa0ac4c-34bb-4789-9ddf-377a427811e6.sql
-- ============================================================================

CREATE TABLE public.marketing_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  niche TEXT,
  total_clicks INTEGER DEFAULT 0,
  top_platform TEXT,
  underperforming_platforms TEXT[] DEFAULT '{}',
  platform_click_breakdown JSONB DEFAULT '{"youtube": 0, "tiktok": 0, "instagram": 0, "other": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_intelligence ENABLE ROW LEVEL SECURITY;

-- Service role can manage all intelligence data (for edge functions)
CREATE POLICY "Service role can manage marketing intelligence" 
ON public.marketing_intelligence 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Users can view their own intelligence data
CREATE POLICY "Users can view own intelligence" 
ON public.marketing_intelligence 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_intelligence_updated_at
BEFORE UPDATE ON public.marketing_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_marketing_intelligence_user_id ON public.marketing_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_intelligence_niche ON public.marketing_intelligence(niche);


-- ============================================================================
-- MIGRATION 9: Fix User Trends Foreign Key
-- Source: 20260205000000_fix_user_trends_fk.sql
-- ============================================================================

-- Fix foreign key constraint on user_trends to reference trends_v2 instead of trends
-- This resolves the mismatch between TrendSelectionV2 (which selects from trends_v2)
-- and the user_trends table (which was constrained to trends table)

-- Drop the old foreign key constraint
ALTER TABLE user_trends 
  DROP CONSTRAINT user_trends_trend_id_fkey;

-- Add the new foreign key constraint to trends_v2
ALTER TABLE user_trends 
  ADD CONSTRAINT user_trends_trend_id_fkey 
  FOREIGN KEY (trend_id) 
  REFERENCES trends_v2(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;


-- ============================================================================
-- MIGRATION 10: Create Storage Buckets
-- Source: 20260206000000_create_storage_buckets.sql
-- ============================================================================

-- Create storage bucket for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  2147483648, -- 2GB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All migrations have been applied in order
-- Next steps:
-- 1. Verify all tables are created
-- 2. Test authentication and RLS policies
-- 3. Upload seed data if needed
-- 4. Configure Supabase Edge Functions (if using)
-- 5. Update application environment variables
-- ============================================================================
