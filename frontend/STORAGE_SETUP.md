"# Storage Infrastructure Setup Guide

## Critical Issue Fixed

This document outlines the storage infrastructure issues that were identified and fixed.

### Problem Identified

1. **Storage Bucket Not Found (404 Error)**
   - The Supabase storage bucket `videos` was referenced in code but never actually created
   - All upload/download operations were failing with \"Bucket not found\" errors
   - Migration files had RLS policies for the bucket but no bucket creation statement

2. **SPA Routing Failure**
   - Refreshing on non-root routes (e.g., `/trends`, `/upload`) caused \"Not Found\" errors
   - Missing fallback routing configuration for Single Page Application

---

## Fixes Implemented

### Part 1: Supabase Storage Bucket Creation

**Created Migration**: `/app/frontend/supabase/migrations/20260206000000_create_storage_buckets.sql`

This migration:
- Creates the `videos` storage bucket with proper configuration
- Sets 2GB file size limit
- Allows video and image MIME types
- Enables public access with RLS policies
- Uses `ON CONFLICT DO NOTHING` for idempotency

**To Apply Migration**:
```bash
# Using Supabase CLI
cd /app/frontend
supabase db push

# Or apply manually in Supabase Dashboard → SQL Editor
```

### Part 2: Enhanced Storage Error Handling

Added comprehensive logging and error handling in all storage operations:

**Files Modified**:
1. `/app/frontend/src/pages/Upload.tsx`
   - Added detailed logging for upload operations
   - Explicit STORAGE_BUCKET_NOT_FOUND error detection
   - Logs bucket name, file path, and error details

2. `/app/frontend/src/pages/Results.tsx`
   - Enhanced video URL fetching with error handling
   - Added user-facing error toasts for storage issues
   - Detailed console logging for debugging

3. `/app/frontend/src/services/contentRenderingService.ts`
   - Enhanced error handling in `fetchVideoFile()`
   - Better logging in `uploadRenderedClip()`
   - Improved thumbnail upload error handling

4. `/app/frontend/src/services/videoRenderService.ts`
   - Added logging to `getVideoUrl()` function
   - Tracks bucket and storage path in logs

### Part 3: SPA Routing Configuration

**Created Configuration Files**:

1. `/app/frontend/public/_redirects` (Netlify format)
   - Redirects all routes to index.html with 200 status

2. `/app/frontend/vercel.json` (Vercel format)
   - Rewrites all routes to index.html
   - Adds security headers

3. `/app/frontend/netlify.toml` (Netlify TOML format)
   - Complete build and redirect configuration

**Updated Vite Config**: `/app/frontend/vite.config.ts`
- Changed build output from 'dist' to 'build'
- Ensured preview server binds to 0.0.0.0

---

## Bucket Configuration Details

**Bucket Name**: `videos`
**Access**: Public with RLS
**File Size Limit**: 2GB (2147483648 bytes)
**Allowed MIME Types**:
- video/mp4
- video/quicktime
- video/x-msvideo
- video/webm
- image/jpeg
- image/png

**RLS Policies** (already existed):
- Users can upload to their own folder: `{user_id}/{filename}`
- Users can view their own videos
- Users can update their own videos
- Users can delete their own videos

---

## Storage Path Convention

All files follow the pattern:
```
{user_id}/{filename}
```

Examples:
- Videos: `abc123-def456/1234567890_xyz789.mp4`
- Clips: `abc123-def456/clips/clip-id_timestamp.mp4`
- Thumbnails: `abc123-def456/thumbnails/clip-id_thumb.jpg`

---

## Verification Steps

### 1. Verify Bucket Exists

**Via Supabase Dashboard**:
1. Go to Storage section
2. Check if `videos` bucket exists
3. Verify it's set to Public

**Via Code**:
```typescript
const { data, error } = await supabase.storage.listBuckets();
console.log('Available buckets:', data);
```

### 2. Test Upload

```typescript
const { data, error } = await supabase.storage
  .from('videos')
  .upload('test.txt', new Blob(['test']), { upsert: true });

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('Upload successful:', data);
}
```

### 3. Test Public URL

```typescript
const { data } = supabase.storage
  .from('videos')
  .getPublicUrl('test.txt');

console.log('Public URL:', data.publicUrl);
```

---

## Troubleshooting

### Issue: \"Bucket not found\" error

**Solution**:
1. Apply the migration: `supabase db push`
2. Or manually create bucket in Supabase Dashboard
3. Ensure bucket name is exactly `videos` (case-sensitive)

### Issue: Upload fails with RLS error

**Solution**:
1. Check user is authenticated: `supabase.auth.getUser()`
2. Verify file path uses user ID as first folder
3. Ensure RLS policies are applied (see migration file)

### Issue: Can't access uploaded files

**Solution**:
1. Check bucket is set to Public in Supabase Dashboard
2. Verify RLS policies allow SELECT for authenticated users
3. Test public URL generation

### Issue: SPA routes show \"Not Found\" on refresh

**Solution**:
1. Ensure build includes `_redirects` file: `ls build/_redirects`
2. For Vercel: Use `vercel.json`
3. For Netlify: Use `netlify.toml` or `_redirects`
4. For custom hosting: Configure server to serve `index.html` for all routes

---

## Deployment Checklist

- [ ] Run migration to create `videos` bucket
- [ ] Verify bucket exists in Supabase Dashboard
- [ ] Set bucket to Public
- [ ] Test file upload
- [ ] Test file download
- [ ] Test public URL generation
- [ ] Verify RLS policies work
- [ ] Test SPA routing on all routes
- [ ] Check browser console for storage errors

---

## Monitoring

All storage operations now include detailed console logging:

**Upload Operations**:
```
[Upload] Uploading video to storage { bucketName, fileName, filePath, size, userId }
[Upload] Video uploaded successfully { uploadData, filePath, bucket }
```

**Download Operations**:
```
[ContentRender] Fetching video file from storage { bucket, storagePath }
[ContentRender] Video file downloaded successfully { size, type }
```

**Error Patterns**:
```
[Upload] Storage upload failed: { error, message, statusCode, bucket, filePath }
STORAGE_BUCKET_NOT_FOUND: The videos storage bucket does not exist
```

Monitor these logs to detect and diagnose storage issues quickly.

---

## Contact

If storage issues persist after applying these fixes:
1. Check browser console for detailed error logs
2. Verify Supabase project connection
3. Ensure API keys are valid
4. Check Supabase service status
"
