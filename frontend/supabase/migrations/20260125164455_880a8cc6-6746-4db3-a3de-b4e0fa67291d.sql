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