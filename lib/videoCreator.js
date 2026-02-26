import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function createVideo(images, audioBuffer, outputPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainrot-'));

  try {
    // Save images
    const imagePaths = [];
    for (let i = 0; i < images.length; i++) {
      const imgPath = path.join(tmpDir, `frame_${i.toString().padStart(3, '0')}.jpg`);
      fs.writeFileSync(imgPath, images[i]);
      imagePaths.push(imgPath);
    }

    // Save audio
    const audioPath = path.join(tmpDir, 'narration.mp3');
    fs.writeFileSync(audioPath, audioBuffer);

    // Create image list for FFmpeg
    const listPath = path.join(tmpDir, 'images.txt');
    const listContent = imagePaths.map(p => `file '${p}'\nduration 3`).join('\n');
    fs.writeFileSync(listPath, listContent);

    // FFmpeg command - creates video from images + audio
    // Using 9:16 aspect ratio (1080x1920) for YouTube Shorts
    const cmd = `ffmpeg -y \
      -f concat -safe 0 -i "${listPath}" \
      -i "${audioPath}" \
      -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
      -c:v libx264 -preset ultrafast -crf 23 \
      -c:a aac -b:a 128k \
      -shortest \
      -movflags +faststart \
      "${outputPath}"`;

    await execAsync(cmd);

    return outputPath;
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

export function isFFmpegAvailable() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (err) => resolve(!err));
  });
}
