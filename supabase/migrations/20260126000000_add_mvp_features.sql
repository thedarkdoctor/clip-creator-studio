-- Migration: Add MVP features for trend discovery, video storage, and Buffer integration

-- Note: After running this migration, create storage buckets:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create bucket 'videos' (public or with RLS)
-- 3. Create bucket 'clips' (optional, for generated clips)

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
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

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

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_buffer_posts_scheduled_at ON public.buffer_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_buffer_posts_status ON public.buffer_posts(status);
CREATE INDEX IF NOT EXISTS idx_trends_discovered_at ON public.trends(discovered_at);
CREATE INDEX IF NOT EXISTS idx_trends_platform_active ON public.trends(platform_id, is_active);
