/**
 * FFmpeg.wasm Service
 * Browser-based video processing using FFmpeg.wasm
 * Handles video trimming, overlay, caption, and audio mixing
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let isReady = false;

/**
 * Initialize FFmpeg.wasm
 * Loads the FFmpeg core and wasm files
 */
export async function initFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (isReady && ffmpegInstance) {
    return ffmpegInstance;
  }

  if (isLoading) {
    // Wait for existing initialization
    while (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return ffmpegInstance!;
  }

  isLoading = true;

  try {
    console.log('[FFmpeg] Initializing FFmpeg.wasm...');
    
    ffmpegInstance = new FFmpeg();

    // Set up progress logging
    ffmpegInstance.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // Set up progress callback
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Load FFmpeg core
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('[FFmpeg] Initialization complete');
    isReady = true;
    isLoading = false;

    return ffmpegInstance;
  } catch (error) {
    isLoading = false;
    console.error('[FFmpeg] Initialization failed:', error);
    throw new Error('Failed to initialize video processor');
  }
}

/**
 * Trim video to specified start and end times
 */
export async function trimVideo(
  videoFile: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg(onProgress);

  try {
    console.log('[FFmpeg] Trimming video:', {
      fileName: videoFile.name,
      startTime,
      endTime,
      duration: endTime - startTime,
    });

    // Write input file to FFmpeg file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Execute trim command
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      '-c', 'copy',
      'output.mp4',
    ]);

    // Read output file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');

    console.log('[FFmpeg] Trim complete');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('[FFmpeg] Trim failed:', error);
    throw new Error('Failed to trim video');
  }
}

/**
 * Add text caption overlay to video
 */
export async function addCaptionOverlay(
  videoFile: File | Blob,
  caption: string,
  fontStyle: {
    family: string;
    size: number;
    weight: string;
    color: string;
  },
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg(onProgress);

  try {
    console.log('[FFmpeg] Adding caption overlay:', caption);

    // Write input file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Convert hex color to RGB for FFmpeg
    const color = fontStyle.color.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Create drawtext filter with word wrapping
    const fontSize = fontStyle.size;
    const fontWeight = fontStyle.weight === 'bold' ? 'bold' : 'normal';
    
    // Escape special characters in caption
    const escapedCaption = caption.replace(/'/g, "\\'").replace(/:/g, "\\:");

    // Execute caption overlay command
    // Position text at bottom center with wrapping
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf',
      `drawtext=text='${escapedCaption}':fontsize=${fontSize}:fontcolor=white@1.0:x=(w-text_w)/2:y=h-th-50:box=1:boxcolor=black@0.7:boxborderw=10`,
      '-c:a', 'copy',
      'output.mp4',
    ]);

    // Read output
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');

    console.log('[FFmpeg] Caption overlay complete');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('[FFmpeg] Caption overlay failed:', error);
    throw new Error('Failed to add caption overlay');
  }
}

/**
 * Mix audio tracks (voiceover and background music) with video
 */
export async function mixAudioTracks(
  videoFile: File | Blob,
  voiceoverUrl?: string,
  backgroundMusicUrl?: string,
  musicVolume: number = 0.3,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg(onProgress);

  try {
    console.log('[FFmpeg] Mixing audio tracks');

    // Write video file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    let command: string[] = [];

    if (voiceoverUrl && backgroundMusicUrl) {
      // Both voiceover and background music
      await ffmpeg.writeFile('voiceover.mp3', await fetchFile(voiceoverUrl));
      await ffmpeg.writeFile('music.mp3', await fetchFile(backgroundMusicUrl));

      command = [
        '-i', 'input.mp4',
        '-i', 'voiceover.mp3',
        '-i', 'music.mp3',
        '-filter_complex',
        `[1:a]volume=1.0[vo];[2:a]volume=${musicVolume}[music];[vo][music]amix=inputs=2:duration=shortest[a]`,
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'output.mp4',
      ];
    } else if (voiceoverUrl) {
      // Only voiceover
      await ffmpeg.writeFile('voiceover.mp3', await fetchFile(voiceoverUrl));

      command = [
        '-i', 'input.mp4',
        '-i', 'voiceover.mp3',
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'output.mp4',
      ];
    } else if (backgroundMusicUrl) {
      // Only background music
      await ffmpeg.writeFile('music.mp3', await fetchFile(backgroundMusicUrl));

      command = [
        '-i', 'input.mp4',
        '-i', 'music.mp3',
        '-filter_complex',
        `[0:a]volume=1.0[orig];[1:a]volume=${musicVolume}[music];[orig][music]amix=inputs=2:duration=shortest[a]`,
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'output.mp4',
      ];
    } else {
      // No audio mixing needed
      console.log('[FFmpeg] No audio tracks to mix');
      return videoFile instanceof Blob ? videoFile : new Blob([await fetchFile(videoFile)], { type: 'video/mp4' });
    }

    // Execute mixing command
    await ffmpeg.exec(command);

    // Read output
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    if (voiceoverUrl) await ffmpeg.deleteFile('voiceover.mp3');
    if (backgroundMusicUrl) await ffmpeg.deleteFile('music.mp3');
    await ffmpeg.deleteFile('output.mp4');

    console.log('[FFmpeg] Audio mixing complete');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('[FFmpeg] Audio mixing failed:', error);
    throw new Error('Failed to mix audio tracks');
  }
}

/**
 * Get video duration and metadata
 */
export async function getVideoMetadata(videoFile: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Complete video rendering pipeline
 * Combines trimming, caption overlay, and audio mixing
 */
export async function renderCompleteClip(
  videoFile: File,
  specs: {
    startTime: number;
    endTime: number;
    caption: string;
    fontStyle: {
      family: string;
      size: number;
      weight: string;
      color: string;
    };
    voiceoverUrl?: string;
    backgroundMusicUrl?: string;
  },
  onProgress?: (stage: string, progress: number) => void
): Promise<Blob> {
  try {
    console.log('[FFmpeg] Starting complete clip rendering pipeline');

    // Stage 1: Trim video (33% of progress)
    onProgress?.('Trimming video', 0);
    const trimmedVideo = await trimVideo(
      videoFile,
      specs.startTime,
      specs.endTime,
      (p) => onProgress?.('Trimming video', Math.round(p * 0.33))
    );

    // Stage 2: Add caption overlay (33% of progress)
    onProgress?.('Adding captions', 33);
    const captionedVideo = await addCaptionOverlay(
      trimmedVideo,
      specs.caption,
      specs.fontStyle,
      (p) => onProgress?.('Adding captions', 33 + Math.round(p * 0.33))
    );

    // Stage 3: Mix audio tracks (34% of progress)
    onProgress?.('Mixing audio', 66);
    const finalVideo = await mixAudioTracks(
      captionedVideo,
      specs.voiceoverUrl,
      specs.backgroundMusicUrl,
      0.3,
      (p) => onProgress?.('Mixing audio', 66 + Math.round(p * 0.34))
    );

    onProgress?.('Complete', 100);
    console.log('[FFmpeg] Clip rendering complete');

    return finalVideo;
  } catch (error) {
    console.error('[FFmpeg] Rendering pipeline failed:', error);
    throw error;
  }
}

/**
 * Clean up FFmpeg resources
 */
export function cleanupFFmpeg() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    isReady = false;
    isLoading = false;
    console.log('[FFmpeg] Cleaned up resources');
  }
}
