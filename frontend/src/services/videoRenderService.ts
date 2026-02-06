/**
 * Video Rendering Service
 * 
 * This service coordinates video rendering and clip generation.
 * For production use, integrate with a video processing service:
 * - Cloudinary (cloudinary.com) - Cloud-based video processing
 * - Mux (mux.com) - Video streaming & processing
 * - FFmpeg.wasm - Browser-based FFmpeg
 * - AWS MediaConvert - Serverless video processing
 */

import { supabase } from '@/integrations/supabase/client';

interface ClipRenderSpec {
  videoId: string;
  startTime: number;
  endTime: number;
  caption: string;
  hashtags: string[];
  fontStyle?: {
    family: string;
    size: number;
    weight: string;
    color: string;
  };
  backgroundMusicUrl?: string | null;
}

interface RenderJobResult {
  success: boolean;
  clipId?: string;
  storageUrl?: string;
  error?: string;
}

/**
 * Get video URL from Supabase storage
 * This allows downloading the source video for editing
 */
export async function getVideoUrl(storagePath: string): Promise<string> {
  console.log('[VideoRender] Getting public URL for video', {
    bucket: 'videos',
    storagePath
  });
  
  const { data } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath);

  console.log('[VideoRender] Public URL generated:', data.publicUrl);
  
  return data.publicUrl;
}

/**
 * Prepare clip specification for rendering service
 * Can be used with external video rendering APIs
 */
export async function prepareClipForRendering(
  videoPath: string,
  clipSpec: ClipRenderSpec
): Promise<{
  videoUrl: string;
  clipSpec: ClipRenderSpec;
}> {
  const videoUrl = await getVideoUrl(videoPath);
  return {
    videoUrl,
    clipSpec,
  };
}

/**
 * Queue video for rendering with external service
 * 
 * Example integration with Cloudinary:
 * 
 * async function renderWithCloudinary(job: RenderJob) {
 *   const cloudinary = require('cloudinary');
 *   cloudinary.v2.config({
 *     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
 *     api_key: process.env.CLOUDINARY_API_KEY,
 *     api_secret: process.env.CLOUDINARY_API_SECRET,
 *   });
 *
 *   const transformation = cloudinary.v2.utils.cloudinaryUrl('video_id', {
 *     start_offset: job.startTime,
 *     end_offset: job.endTime,
 *     resource_type: 'video',
 *   });
 *
 *   return transformation[0];
 * }
 */
export async function queueVideoRenderJob(
  clipId: string,
  spec: ClipRenderSpec
): Promise<RenderJobResult> {
  try {
    // For MVP, we create a placeholder job status
    // In production, this would integrate with a video processing service
    
    console.log('[VideoRender] Queueing render job for clip:', clipId);
    
    // Option 1: Manually edit with frontend video editor
    // Option 2: Use browser-based FFmpeg.wasm
    // Option 3: Send to external API (Cloudinary, Mux, etc.)
    // Option 4: Use AWS Lambda + MediaConvert
    
    return {
      success: true,
      clipId,
      error: 'Video rendering requires external service integration. Use Cloudinary, Mux, or FFmpeg.wasm for production.',
    };
  } catch (error: any) {
    console.error('[VideoRender] Error queuing render job:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get clip download information
 * Users can download the source video and use it with a video editor
 * Or integrate with automated rendering service
 */
export async function getClipDownloadInfo(
  videoId: string,
  clipId: string
): Promise<{
  videoUrl: string;
  clipSpecs: any;
  downloadReady: boolean;
}> {
  try {
    // Fetch clip and video info
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select(`
        *,
        videos (
          id,
          storage_path,
          duration_seconds
        )
      `)
      .eq('id', clipId)
      .single();

    if (clipError || !clip?.videos) {
      throw new Error('Clip not found');
    }

    const video = clip.videos as any;
    const videoUrl = await getVideoUrl(video.storage_path);

    // Cast to any to access new columns not yet in Supabase types
    const clipData = clip as any;

    return {
      videoUrl,
      clipSpecs: {
        startTime: clipData.start_time_seconds || 0,
        endTime: clipData.end_time_seconds || video.duration_seconds,
        caption: clipData.caption,
        hashtags: clipData.hashtags,
        fontStyle: clipData.font_style,
        backgroundMusic: clipData.background_music_url,
      },
      downloadReady: true,
    };
  } catch (error: any) {
    console.error('[VideoRender] Error getting download info:', error);
    throw error;
  }
}

/**
 * Integration guide for production rendering
 * 
 * VIDEO RENDERING OPTIONS:
 * 
 * 1. CLOUDINARY (Recommended for simplicity)
 *    - Cloud-based video transformation
 *    - Supports trimming, overlays, captions
 *    - Easy integration
 *    
 * 2. MUX
 *    - Video streaming and processing
 *    - Real-time transcoding
 *    - Good for live processing
 *    
 * 3. FFmpeg.wasm
 *    - Browser-based, no server needed
 *    - Can be slow for large videos
 *    - Good for simple trimming
 *    
 * 4. AWS Lambda + MediaConvert
 *    - Serverless video processing
 *    - Scalable and cost-effective
 *    - Complex setup
 * 
 * To implement:
 * 1. Choose a service above
 * 2. Set up API credentials
 * 3. Implement renderJob function with your service
 * 4. Call it from processVideoAndCreateClips in clip-generation Edge Function
 */

