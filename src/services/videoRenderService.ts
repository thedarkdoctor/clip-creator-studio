// src/services/videoRenderService.ts
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { supabase } from '@/integrations/supabase/client';

interface RenderJob {
  scenes: string[];
  voiceover: string;
  music: string;
  subtitles: string;
  format: 'vertical' | 'square' | 'horizontal';
  duration_target: number;
  job_id?: string;
}

const TMP_DIR = '/tmp/cliplyst_render';

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url}`);
  const buffer = await res.buffer();
  await fs.writeFile(dest, buffer);
}

function ffmpegCmd(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || stdout);
      resolve();
    });
  });
}

export async function renderVideoJob(job: RenderJob) {
  const jobId = job.job_id || `job_${Date.now()}`;
  const jobDir = path.join(TMP_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  // 1. Download all assets
  const sceneFiles: string[] = [];
  for (let i = 0; i < job.scenes.length; i++) {
    const dest = path.join(jobDir, `scene${i}.mp4`);
    await downloadFile(job.scenes[i], dest);
    sceneFiles.push(dest);
  }
  const voiceFile = path.join(jobDir, 'voiceover.mp3');
  await downloadFile(job.voiceover, voiceFile);
  const musicFile = path.join(jobDir, 'music.mp3');
  await downloadFile(job.music, musicFile);

  // 2. Trim scenes to match duration_target
  const perScene = Math.floor(job.duration_target / sceneFiles.length);
  const trimmedFiles: string[] = [];
  for (let i = 0; i < sceneFiles.length; i++) {
    const trimmed = path.join(jobDir, `trimmed${i}.mp4`);
    await ffmpegCmd(`ffmpeg -y -i ${sceneFiles[i]} -t ${perScene} -vf "scale=1080:1920,setsar=1" -an ${trimmed}`);
    trimmedFiles.push(trimmed);
  }

  // 3. Add transitions (simple fade)
  const concatList = path.join(jobDir, 'concat.txt');
  await fs.writeFile(concatList, trimmedFiles.map(f => `file '${f}'`).join('\n'));
  const mergedVideo = path.join(jobDir, 'merged.mp4');
  await ffmpegCmd(`ffmpeg -y -f concat -safe 0 -i ${concatList} -c copy ${mergedVideo}`);

  // 4. Mix audio
  const audioMix = path.join(jobDir, 'audio_mix.mp3');
  await ffmpegCmd(`ffmpeg -y -i ${voiceFile} -i ${musicFile} -filter_complex "[1:a]volume=0.2[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2" -c:a libmp3lame -q:a 2 ${audioMix}`);

  // 5. Generate subtitles
  const subsFile = path.join(jobDir, 'subs.srt');
  await fs.writeFile(subsFile, `1\n00:00:00,000 --> 00:00:${job.duration_target},000\n${job.subtitles}\n`);

  // 6. Final mux: add audio, subtitles, compress
  const finalVideo = path.join(jobDir, 'final.mp4');
  await ffmpegCmd(`ffmpeg -y -i ${mergedVideo} -i ${audioMix} -vf "subtitles=${subsFile}" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 128k -movflags +faststart -t ${job.duration_target} -aspect 9:16 -s 1080x1920 ${finalVideo}`);

  // 7. Upload to storage (Supabase)
  const fileBuffer = await fs.readFile(finalVideo);
  const { data, error } = await supabase.storage.from('generated_videos').upload(`${jobId}/final.mp4`, fileBuffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw error;
  const { publicUrl } = supabase.storage.from('generated_videos').getPublicUrl(`${jobId}/final.mp4`).data;

  // 8. Track status
  // Table 'video_render_jobs' does not exist in current Supabase types. Comment out for now.
  // await supabase.from('video_render_jobs').upsert({ job_id: jobId, status: 'complete', video_url: publicUrl, finished_at: new Date().toISOString() });

  // Cleanup
  await fs.rm(jobDir, { recursive: true, force: true });

  return publicUrl;
}
