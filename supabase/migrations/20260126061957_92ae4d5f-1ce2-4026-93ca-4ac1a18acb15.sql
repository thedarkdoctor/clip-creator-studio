-- Create storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false);

-- Add storage_path column to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS storage_path text;

-- RLS policies for video storage
CREATE POLICY "Users can upload own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);