import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { VIDEO_CONFIG } from "./config";
import type { ProcessingResult } from "./types";

const execAsync = promisify(exec);

export async function processVideo(
  videoId: number,
  inputPath: string,
  challengeId: string
): Promise<ProcessingResult> {
  const workDir = path.join(VIDEO_CONFIG.FRAMES_DIR, `job_${videoId}`);
  const framesDir = path.join(workDir, 'frames');
  const cleanFramesDir = path.join(workDir, 'clean');
  const outputPath = path.join(VIDEO_CONFIG.PROCESSED_DIR, `${challengeId}.webm`);

  try {
    await fs.mkdir(framesDir, { recursive: true });
    await fs.mkdir(cleanFramesDir, { recursive: true });
    await fs.mkdir(VIDEO_CONFIG.PROCESSED_DIR, { recursive: true });

    console.log(`[VideoProcessor] Starting processing for video ${videoId}`);

    console.log(`[VideoProcessor] Extracting frames...`);
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -vf "fps=${VIDEO_CONFIG.OUTPUT_FPS},scale=${VIDEO_CONFIG.OUTPUT_WIDTH}:${VIDEO_CONFIG.OUTPUT_HEIGHT}" "${framesDir}/%04d.png"`,
      { timeout: 300000 }
    );

    const frameFiles = await fs.readdir(framesDir);
    const frameCount = frameFiles.filter(f => f.endsWith('.png')).length;
    console.log(`[VideoProcessor] Extracted ${frameCount} frames`);

    console.log(`[VideoProcessor] Applying chromakey background removal...`);
    for (const file of frameFiles.filter(f => f.endsWith('.png'))) {
      const inputFrame = path.join(framesDir, file);
      const outputFrame = path.join(cleanFramesDir, file);
      
      await execAsync(
        `ffmpeg -y -i "${inputFrame}" -vf "chromakey=${VIDEO_CONFIG.CHROMA_KEY_COLOR}:${VIDEO_CONFIG.CHROMA_KEY_SIMILARITY}:${VIDEO_CONFIG.CHROMA_KEY_BLEND}" "${outputFrame}"`,
        { timeout: 30000 }
      );
    }

    console.log(`[VideoProcessor] Reassembling video with alpha and audio...`);
    await execAsync(
      `ffmpeg -y -framerate ${VIDEO_CONFIG.OUTPUT_FPS} -i "${cleanFramesDir}/%04d.png" -i "${inputPath}" ` +
      `-c:v libvpx-vp9 -pix_fmt yuva420p -crf ${VIDEO_CONFIG.VIDEO_CRF} -b:v 0 ` +
      `-map 0:v -map 1:a? -c:a libopus -b:a ${VIDEO_CONFIG.AUDIO_BITRATE} ` +
      `-deadline good -cpu-used 4 "${outputPath}"`,
      { timeout: 300000 }
    );

    const { stdout: probeOutput } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${outputPath}"`
    );
    const probeData = JSON.parse(probeOutput);
    const duration = parseFloat(probeData.format.duration);

    const stats = await fs.stat(outputPath);
    const fileSize = stats.size;

    console.log(`[VideoProcessor] Completed: ${duration}s, ${(fileSize/1024/1024).toFixed(2)}MB`);

    await fs.rm(workDir, { recursive: true, force: true });
    await fs.rm(inputPath, { force: true });

    return { outputPath, duration, fileSize };

  } catch (error) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function processVideoSimple(
  videoId: number,
  inputPath: string,
  challengeId: string
): Promise<ProcessingResult> {
  const outputPath = path.join(VIDEO_CONFIG.PROCESSED_DIR, `${challengeId}.webm`);

  try {
    await fs.mkdir(VIDEO_CONFIG.PROCESSED_DIR, { recursive: true });

    console.log(`[VideoProcessor] Starting simple processing for video ${videoId}`);

    await execAsync(
      `ffmpeg -y -i "${inputPath}" ` +
      `-vf "fps=${VIDEO_CONFIG.OUTPUT_FPS},scale=${VIDEO_CONFIG.OUTPUT_WIDTH}:${VIDEO_CONFIG.OUTPUT_HEIGHT},chromakey=${VIDEO_CONFIG.CHROMA_KEY_COLOR}:${VIDEO_CONFIG.CHROMA_KEY_SIMILARITY}:${VIDEO_CONFIG.CHROMA_KEY_BLEND}" ` +
      `-c:v libvpx-vp9 -pix_fmt yuva420p -crf ${VIDEO_CONFIG.VIDEO_CRF} -b:v 0 ` +
      `-c:a libopus -b:a ${VIDEO_CONFIG.AUDIO_BITRATE} ` +
      `-deadline good -cpu-used 4 "${outputPath}"`,
      { timeout: 600000 }
    );

    const { stdout: probeOutput } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${outputPath}"`
    );
    const probeData = JSON.parse(probeOutput);
    const duration = parseFloat(probeData.format.duration);

    const stats = await fs.stat(outputPath);
    const fileSize = stats.size;

    console.log(`[VideoProcessor] Completed: ${duration}s, ${(fileSize/1024/1024).toFixed(2)}MB`);

    await fs.rm(inputPath, { force: true });

    return { outputPath, duration, fileSize };

  } catch (error) {
    console.error(`[VideoProcessor] Error:`, error);
    throw error;
  }
}
