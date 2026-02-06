"# 🚨 URGENT: Apply Storage Bucket Migration

## Your Supabase Project
**URL**: https://hnkrklkozvgwjfxeearh.supabase.co

---

## Option 1: Apply via Supabase Dashboard (EASIEST)

### Step 1: Go to SQL Editor
1. Open: https://supabase.com/dashboard/project/hnkrklkozvgwjfxeearh/sql/new
2. Click \"New Query\"

### Step 2: Copy and Paste This SQL

```sql
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
```

### Step 3: Run the SQL
- Click \"Run\" button (or press Ctrl+Enter)
- Should see: \"Success. No rows returned\"

### Step 4: Verify Bucket Was Created
1. Go to: https://supabase.com/dashboard/project/hnkrklkozvgwjfxeearh/storage/buckets
2. You should see a bucket named **\"videos\"**
3. Click on it - should show \"Public bucket\" with 2GB limit

---

## Option 2: Create Bucket Manually (IF SQL FAILS)

### Step 1: Go to Storage
https://supabase.com/dashboard/project/hnkrklkozvgwjfxeearh/storage/buckets

### Step 2: Create New Bucket
- Click \"New bucket\" button
- **Name**: `videos` (exactly this, case-sensitive)
- **Public bucket**: ✅ YES (check this box)
- **File size limit**: `2147483648` (2GB)
- **Allowed MIME types**: 
  - video/mp4
  - video/quicktime
  - video/x-msvideo
  - video/webm
  - image/jpeg
  - image/png
- Click \"Create bucket\"

### Step 3: Verify RLS Policies
The RLS policies should already exist from previous migrations. Check:
1. Go to Storage → videos bucket → Policies
2. Should see 4 policies:
   - Users can upload videos
   - Users can view own videos
   - Users can update own videos
   - Users can delete own videos

---

## After Migration is Applied

### Test It Works

1. **Refresh your app**
2. **Go to /upload page**
3. **Upload a test video**
4. **Check browser console** - should see:
   ```
   [Upload] Uploading video to storage { bucketName: 'videos', ... }
   [Upload] Video uploaded successfully
   ```
5. **Go to /results page** 
6. **Click \"Download Video\"** - should work (not 404)

### If Still Not Working

Check browser console for errors. If you see:
- ✅ `STORAGE_BUCKET_NOT_FOUND` → Migration wasn't applied
- ✅ `Bucket not found` → Bucket name is wrong (must be exactly 'videos')
- ✅ RLS error → Need to check policies

---

## Why This is Needed

The app code references a storage bucket called `videos`:
- Upload.tsx: `supabase.storage.from('videos')`
- Results.tsx: `supabase.storage.from('videos')`
- contentRenderingService.ts: `supabase.storage.from('videos')`

But this bucket **never existed** until you create it with this migration!

---

## Quick Check - Is Bucket Created?

Run this in Supabase SQL Editor:
```sql
SELECT * FROM storage.buckets WHERE id = 'videos';
```

Should return 1 row with bucket details. If 0 rows, bucket doesn't exist yet.
"
