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