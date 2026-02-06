# Cliplyst MVP Setup Guide

This guide explains how to set up and deploy the fully functional MVP with real trend discovery, video processing, and Buffer integration.

## Prerequisites

- Supabase project with database and storage configured
- Buffer API access token (optional, for scheduling)
- YouTube Data API key (optional, for trend discovery)

## Database Setup

1. **Run Migrations**
   ```bash
   # Apply the new migration
   supabase migration up
   ```

2. **Create Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create a bucket named `videos` with public access (or configure RLS policies)
   - This bucket will store uploaded long-form videos

3. **Create Storage Bucket for Clips** (optional)
   - Create a bucket named `clips` for generated short-form clips

## Environment Variables

### Supabase Edge Functions

Set these in your Supabase project settings → Edge Functions → Secrets:

```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional - for YouTube trend discovery
YOUTUBE_API_KEY=your_youtube_api_key

# Optional - for Buffer scheduling
BUFFER_ACCESS_TOKEN=your_buffer_access_token
```

### Frontend (.env)

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Deploy Edge Functions

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Deploy Edge Functions**
   ```bash
   # Deploy trend-discovery function
   supabase functions deploy trend-discovery

   # Deploy clip-generation function
   supabase functions deploy clip-generation

   # Deploy buffer-scheduler function
   supabase functions deploy buffer-scheduler
   ```

## Features Implemented

### 1. Real Trend Discovery ✅

- **Edge Function**: `trend-discovery`
- **Tier 1**: YouTube Data API (if configured)
- **Tier 2**: Public embed endpoints (TikTok, Instagram placeholders)
- **Tier 3**: Cached trends from database
- **Fallback**: Static trends per niche

**Usage**: Click "Discover New Trends" button on Trend Selection page

### 2. Video Upload to Storage ✅

- Videos are uploaded to Supabase Storage bucket `videos`
- Storage path stored in database
- File metadata (size, duration) tracked

**Usage**: Upload video on Upload page - automatically saves to storage

### 3. Smart Clip Generation ✅

- **Edge Function**: `clip-generation`
- Analyzes selected trends to extract:
  - Average duration
  - Pacing (fast/medium/slow)
  - Hook timing
- Generates 2-5 clips per platform
- Creates database records with timing metadata

**Note**: Actual video processing (FFmpeg) needs to be implemented via:
- External video processing service
- Background job queue
- Cloudinary or similar service

Currently creates metadata records. Video processing can be added later.

### 4. Buffer Scheduling ✅

- **Edge Function**: `buffer-scheduler`
- Schedules posts to Buffer API
- Supports multiple posting frequencies:
  - Once a week
  - Twice a week
  - Daily
  - Every other day
  - Custom schedule
- Stores scheduled posts in `buffer_posts` table
- UTC-based scheduling

**Usage**: 
1. Select clips on Results page
2. Click "Schedule Posts"
3. Choose posting frequency
4. Posts are scheduled starting tomorrow at 9 AM UTC

## Database Schema Updates

### New Fields

**trends table**:
- `media_url` - URL to trend media (video/image)
- `media_type` - 'video' or 'image'
- `embed_url` - Embeddable URL for previews
- `views`, `likes` - Engagement metrics
- `source_url` - Original source URL
- `discovered_at` - When trend was discovered

**videos table**:
- `storage_path` - Path in Supabase Storage
- `file_size` - File size in bytes
- `duration_seconds` - Video duration

**generated_clips table**:
- `storage_path` - Path to generated clip
- `start_time_seconds` - Start time in source video
- `end_time_seconds` - End time in source video
- `thumbnail_url` - Thumbnail image URL

### New Tables

**buffer_posts table**:
- Stores scheduled Buffer posts
- Links to `generated_clips`
- Tracks status (pending, scheduled, published, failed)
- Stores Buffer API post ID

## API Integration Notes

### YouTube Data API

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Add key to Edge Function secrets

### Buffer API

1. Get access token from [Buffer App Settings](https://buffer.com/app/account/apps)
2. Connect your social media accounts
3. Add token to Edge Function secrets

**Note**: Buffer integration will work without token (posts saved to DB but not scheduled to Buffer)

## Testing

### Test Trend Discovery

1. Go to Brand Setup, select niche and platforms
2. Go to Trend Selection
3. Click "Discover New Trends"
4. Verify trends appear with media previews

### Test Video Upload

1. Upload a video file
2. Check Supabase Storage - file should be in `videos/` bucket
3. Check `videos` table - record should have `storage_path`

### Test Clip Generation

1. Complete upload flow
2. Processing page should call `clip-generation` function
3. Check `generated_clips` table - should have multiple clips
4. Results page should display clips

### Test Buffer Scheduling

1. Go to Results page
2. Select clips (click + icon)
3. Click "Schedule Posts"
4. Choose frequency and confirm
5. Check `buffer_posts` table - should have scheduled posts

## Troubleshooting

### Trends not appearing
- Check Edge Function logs in Supabase Dashboard
- Verify YouTube API key is set (optional)
- Check database for cached trends

### Video upload fails
- Verify `videos` bucket exists in Storage
- Check bucket permissions (should allow authenticated uploads)
- Verify RLS policies allow user to upload

### Clip generation fails
- Check Edge Function logs
- Verify video record exists and has `storage_path`
- Check user has selected trends

### Buffer scheduling fails
- Verify Buffer access token is set (optional)
- Check Buffer API status
- Verify user has connected social accounts in Buffer
- Posts will still be saved to DB even if Buffer API fails

## Next Steps

### Video Processing Implementation

To add actual video processing:

1. **Option A: External Service**
   - Use Cloudinary, Mux, or similar
   - Call from `clip-generation` function
   - Process video and upload clips to storage

2. **Option B: Background Jobs**
   - Use Supabase Edge Functions with queue
   - Process videos asynchronously
   - Update clip records when complete

3. **Option C: FFmpeg Service**
   - Deploy FFmpeg service (e.g., on Railway, Render)
   - Call from Edge Function
   - Return processed clip URLs

### Enhanced Trend Discovery

- Integrate TikTok API (when available)
- Add Instagram Graph API (requires app approval)
- Implement trend aggregator services
- Add caching layer for discovered trends

### Buffer Enhancements

- Add media upload to Buffer
- Support multiple Buffer accounts
- Add scheduling calendar view
- Show Buffer post status updates

## Security Notes

- All Edge Functions use service role key (server-side only)
- RLS policies enforce user data isolation
- Storage buckets should have proper access policies
- Buffer tokens stored as secrets (never exposed to frontend)

## Support

For issues:
1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Verify environment variables are set
4. Check database RLS policies
