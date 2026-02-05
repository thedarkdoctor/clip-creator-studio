/**
 * Content Rendering Service
 * Orchestrates the complete content generation and video rendering process
 * Integrates AI services with FFmpeg.wasm video processing
 */

import { supabase } from '@/integrations/supabase/client';
import {
  initFFmpeg,
  trimVideo,
  addCaptionOverlay,
  mixAudioTracks,
  renderCompleteClip,
  getVideoMetadata,
} from './ffmpegService';

export interface ClipRenderSpec {
  clipId: string;
  videoId: string;
  videoFile: File;
  startTime: number;
  endTime: number;
  caption: string;
  hashtags: string[];
  platformId: string;
  fontStyle: {
    family: string;
    size: number;
    weight: string;
    color: string;
  };
  voiceoverUrl?: string;
  backgroundMusicUrl?: string;
}

export interface RenderProgress {
  clipId: string;
  stage: 'queued' | 'trimming' | 'captioning' | 'audio-mixing' | 'uploading' | 'complete' | 'failed';
  progress: number;
  message: string;
}

export interface RenderResult {
  clipId: string;
  success: boolean;
  storageUrl?: string;
  error?: string;
}

/**
 * Fetch video file from Supabase storage
 */
async function fetchVideoFile(storagePath: string): Promise<File> {
  try {
    const { data, error } = await supabase.storage
      .from('videos')
      .download(storagePath);

    if (error) throw error;

    const fileName = storagePath.split('/').pop() || 'video.mp4';
    return new File([data], fileName, { type: 'video/mp4' });
  } catch (error) {
    console.error('[ContentRender] Failed to fetch video:', error);
    throw new Error('Failed to download video file');
  }
}

/**
 * Upload rendered clip to Supabase storage
 */
async function uploadRenderedClip(
  clipBlob: Blob,
  clipId: string,
  userId: string
): Promise<string> {
  try {
    const fileName = `${clipId}_${Date.now()}.mp4`;
    const filePath = `${userId}/clips/${fileName}`;

    console.log('[ContentRender] Uploading rendered clip:', filePath);

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(filePath, clipBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('[ContentRender] Upload complete:', urlData.publicUrl);
    return filePath;
  } catch (error) {
    console.error('[ContentRender] Upload failed:', error);
    throw new Error('Failed to upload rendered clip');
  }
}

/**
 * Update clip record in database with rendered video path
 */
async function updateClipRecord(
  clipId: string,
  storagePath: string,
  thumbnailPath?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('generated_clips')
      .update({
        storage_path: storagePath,
        thumbnail_url: thumbnailPath || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clipId);

    if (error) throw error;

    console.log('[ContentRender] Clip record updated:', clipId);
  } catch (error) {
    console.error('[ContentRender] Failed to update clip record:', error);
    throw new Error('Failed to update database');
  }
}

/**
 * Generate a thumbnail from video blob
 */
async function generateThumbnail(
  videoBlob: Blob,
  clipId: string,
  userId: string
): Promise<string | undefined> {
  try {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return undefined;

    // Load video
    video.src = URL.createObjectURL(videoBlob);
    await new Promise((resolve) => {
      video.onloadeddata = resolve;
    });

    // Seek to 1 second
    video.currentTime = Math.min(1, video.duration / 2);
    await new Promise((resolve) => {
      video.onseeked = resolve;
    });

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    const thumbnailBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
    });

    // Upload thumbnail
    const thumbnailFileName = `${clipId}_thumb.jpg`;
    const thumbnailPath = `${userId}/thumbnails/${thumbnailFileName}`;

    const { error } = await supabase.storage
      .from('videos')
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[ContentRender] Thumbnail upload failed:', error);
      return undefined;
    }

    // Clean up
    URL.revokeObjectURL(video.src);

    return thumbnailPath;
  } catch (error) {
    console.error('[ContentRender] Thumbnail generation failed:', error);
    return undefined;
  }
}

/**
 * Render a single clip with full AI-generated assets
 */
export async function renderSingleClip(
  spec: ClipRenderSpec,
  userId: string,
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderResult> {
  const clipId = spec.clipId;

  try {
    console.log('[ContentRender] Starting clip render:', clipId);

    // Initialize FFmpeg
    onProgress?.({
      clipId,
      stage: 'queued',
      progress: 0,
      message: 'Initializing video processor...',
    });

    await initFFmpeg((p) => {
      onProgress?.({
        clipId,
        stage: 'queued',
        progress: Math.min(10, p / 10),
        message: 'Loading video processor...',
      });
    });

    // Render complete clip
    onProgress?.({
      clipId,
      stage: 'trimming',
      progress: 10,
      message: 'Processing video...',
    });

    const renderedBlob = await renderCompleteClip(
      spec.videoFile,
      {
        startTime: spec.startTime,
        endTime: spec.endTime,
        caption: spec.caption,
        fontStyle: spec.fontStyle,
        voiceoverUrl: spec.voiceoverUrl,
        backgroundMusicUrl: spec.backgroundMusicUrl,
      },
      (stage, progress) => {
        const stageMap: Record<string, RenderProgress['stage']> = {
          'Trimming video': 'trimming',
          'Adding captions': 'captioning',
          'Mixing audio': 'audio-mixing',
        };

        onProgress?.({
          clipId,
          stage: stageMap[stage] || 'trimming',
          progress: 10 + Math.round(progress * 0.7), // 10-80%
          message: stage,
        });
      }
    );

    // Generate thumbnail
    onProgress?.({
      clipId,
      stage: 'uploading',
      progress: 80,
      message: 'Generating thumbnail...',
    });

    const thumbnailPath = await generateThumbnail(renderedBlob, clipId, userId);

    // Upload to storage
    onProgress?.({
      clipId,
      stage: 'uploading',
      progress: 85,
      message: 'Uploading rendered video...',
    });

    const storagePath = await uploadRenderedClip(renderedBlob, clipId, userId);

    // Update database record
    onProgress?.({
      clipId,
      stage: 'uploading',
      progress: 95,
      message: 'Updating database...',
    });

    await updateClipRecord(clipId, storagePath, thumbnailPath);

    // Complete
    onProgress?.({
      clipId,
      stage: 'complete',
      progress: 100,
      message: 'Clip rendering complete!',
    });

    console.log('[ContentRender] Clip rendered successfully:', clipId);

    return {
      clipId,
      success: true,
      storageUrl: storagePath,
    };
  } catch (error: any) {
    console.error('[ContentRender] Clip rendering failed:', error);

    onProgress?.({
      clipId,
      stage: 'failed',
      progress: 0,
      message: error.message || 'Rendering failed',
    });

    return {
      clipId,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Render multiple clips in sequence
 */
export async function renderMultipleClips(
  videoId: string,
  videoStoragePath: string,
  userId: string,
  onProgress?: (clipId: string, progress: RenderProgress) => void
): Promise<RenderResult[]> {
  try {
    console.log('[ContentRender] Starting batch render for video:', videoId);

    // Fetch video file once
    const videoFile = await fetchVideoFile(videoStoragePath);

    // Get clip specifications from database
    const { data: clips, error } = await supabase
      .from('generated_clips')
      .select(`
        id,
        start_time_seconds,
        end_time_seconds,
        caption,
        hashtags,
        platform_id,
        font_style,
        background_music_url
      `)
      .eq('video_id', videoId)
      .is('storage_path', null); // Only render clips without videos yet

    if (error) throw error;

    if (!clips || clips.length === 0) {
      console.log('[ContentRender] No clips to render');
      return [];
    }

    console.log(`[ContentRender] Rendering ${clips.length} clips`);

    // Render clips sequentially
    const results: RenderResult[] = [];

    for (const clip of clips) {
      const spec: ClipRenderSpec = {
        clipId: clip.id,
        videoId,
        videoFile,
        startTime: clip.start_time_seconds,
        endTime: clip.end_time_seconds,
        caption: clip.caption,
        hashtags: clip.hashtags || [],
        platformId: clip.platform_id,
        fontStyle: clip.font_style || {
          family: 'Arial',
          size: 24,
          weight: 'bold',
          color: '#FFFFFF',
        },
        backgroundMusicUrl: clip.background_music_url || undefined,
      };

      const result = await renderSingleClip(
        spec,
        userId,
        (progress) => onProgress?.(clip.id, progress)
      );

      results.push(result);
    }

    console.log('[ContentRender] Batch render complete');
    return results;
  } catch (error) {
    console.error('[ContentRender] Batch render failed:', error);
    throw error;
  }
}

/**
 * Check if FFmpeg is supported in the current browser
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}
