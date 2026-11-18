/**
 * scripts/gtm/export_telegram_gifs.cjs
 * 
 * High-fidelity post-processing harness for GTM Product Demos:
 * Converts raw Playwright WebM captures into:
 *  1. Crisp, lightweight animated GIFs (< 5MB) optimized for Telegram channels & Stomchats
 *     using two-pass palette generation (Lanczos scaling + Bayer dithering).
 *  2. Universal web-ready MP4 (H.264, yuv420p, faststart for instant streaming).
 *  3. High-res cover poster PNG for Telegram previews.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const VIDEOS_DIR = path.join(REPO_ROOT, 'artifacts/gtm_demos/videos');
const EXPORT_DIR = path.join(REPO_ROOT, 'artifacts/gtm_demos/exports');

// Target max GIF size for Telegram: 5 MB (5 * 1024 * 1024 bytes)
const MAX_GIF_SIZE_BYTES = 5.0 * 1024 * 1024;

function findFfmpeg() {
  const staticPath = 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python313\\Lib\\site-packages\\static_ffmpeg\\bin\\win32\\ffmpeg.EXE';
  if (fs.existsSync(staticPath)) {
    return staticPath;
  }
  const playwrightPath = 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\ffmpeg-1011\\ffmpeg-win64.exe';
  if (fs.existsSync(playwrightPath)) {
    return playwrightPath;
  }
  return 'ffmpeg';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function processVideo(ffmpegPath, webmPath) {
  const baseName = path.basename(webmPath, '.webm');
  console.log(`\n======================================================`);
  console.log(`🎬 Processing demo recording: ${baseName}`);
  console.log(`   Source: ${webmPath} (${formatBytes(getFileSize(webmPath))})`);

  const mp4Path = path.join(EXPORT_DIR, `${baseName}.mp4`);
  const gifPath = path.join(EXPORT_DIR, `${baseName}.gif`);
  const posterPath = path.join(EXPORT_DIR, `${baseName}_poster.png`);
  const palettePath = path.join(EXPORT_DIR, `${baseName}_palette.png`);

  // 1. Generate High-Res Poster PNG (at 2s mark or first frame)
  console.log(`📸 [1/3] Generating Cover Poster (${baseName}_poster.png)...`);
  try {
    execFileSync(ffmpegPath, ['-y', '-ss', '00:00:02', '-i', webmPath, '-vframes', '1', posterPath], { stdio: 'pipe' });
    console.log(`   ✅ Poster created: ${formatBytes(getFileSize(posterPath))}`);
  } catch (err) {
    console.warn(`   ⚠️ Fallback poster generation at 00:00:00: ${err.message}`);
    execFileSync(ffmpegPath, ['-y', '-i', webmPath, '-vframes', '1', posterPath], { stdio: 'pipe' });
  }

  // 2. Generate Universal H.264 MP4 (Optimized for Telegram Video Player)
  console.log(`🎥 [2/3] Encoding MP4 H.264 (${baseName}.mp4)...`);
  try {
    execFileSync(ffmpegPath, [
      '-y', '-i', webmPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-preset', 'medium',
      '-crf', '22',
      '-movflags', '+faststart',
      mp4Path,
    ], { stdio: 'pipe' });
    console.log(`   ✅ MP4 created: ${formatBytes(getFileSize(mp4Path))}`);
  } catch (err) {
    console.warn(`   ⚠️ H.264 fallback encoding: ${err.message}`);
    execFileSync(ffmpegPath, ['-y', '-i', webmPath, mp4Path], { stdio: 'pipe' });
  }

  // 3. Generate Crisp Animated GIF with 2-Pass Palette (< 5MB Telegram limit)
  console.log(`🎞️ [3/3] Encoding High-Fidelity GIF (${baseName}.gif)...`);
  
  // Decide target scale & fps based on scenario (mobile vs desktop)
  const isMobile = baseName.includes('mobile') || baseName.includes('budget');
  let targetWidth = isMobile ? 390 : 640;
  let targetFps = 10;

  function runGifPass(width, fps) {
    // Pass A: generate optimal color palette
    execFileSync(ffmpegPath, [
      '-y', '-i', webmPath,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      palettePath,
    ], { stdio: 'pipe' });

    // Pass B: render gif with bayer dither
    execFileSync(ffmpegPath, [
      '-y', '-i', webmPath,
      '-i', palettePath,
      '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`,
      gifPath,
    ], { stdio: 'pipe' });

    if (fs.existsSync(palettePath)) {
      fs.unlinkSync(palettePath);
    }
    return getFileSize(gifPath);
  }

  let gifSize = runGifPass(targetWidth, targetFps);
  console.log(`   Pass 1 (${targetWidth}px @ ${targetFps}fps): ${formatBytes(gifSize)}`);

  // If GIF is over Telegram limit, optimize parameters deterministically
  if (gifSize > MAX_GIF_SIZE_BYTES) {
    console.log(`   ⚠️ GIF size (${formatBytes(gifSize)}) exceeds 5MB limit. Running Pass 2 compression...`);
    targetWidth = Math.round(targetWidth * 0.8 / 2) * 2;
    targetFps = 8;
    gifSize = runGifPass(targetWidth, targetFps);
    console.log(`   Pass 2 (${targetWidth}px @ ${targetFps}fps): ${formatBytes(gifSize)}`);
  }

  if (gifSize > MAX_GIF_SIZE_BYTES) {
    console.log(`   ⚠️ Running Pass 3 aggressive compression...`);
    targetWidth = Math.round(targetWidth * 0.75 / 2) * 2;
    targetFps = 6;
    gifSize = runGifPass(targetWidth, targetFps);
    console.log(`   Pass 3 (${targetWidth}px @ ${targetFps}fps): ${formatBytes(gifSize)}`);
  }

  const status = gifSize <= MAX_GIF_SIZE_BYTES ? '✅ PASSED (<5MB)' : '⚠️ OVER BUDGET';
  console.log(`   ${status} Final GIF size: ${formatBytes(gifSize)}`);

  return {
    baseName,
    mp4Size: getFileSize(mp4Path),
    gifSize: getFileSize(gifPath),
    posterSize: getFileSize(posterPath),
    underLimit: gifSize <= MAX_GIF_SIZE_BYTES,
  };
}

function main() {
  console.log('🚀 [GTM Demo Export] Initializing video-to-GIF & MP4 converter harness...');
  const ffmpegPath = findFfmpeg();
  console.log(`🔧 ffmpeg binary: ${ffmpegPath}`);

  ensureDir(VIDEOS_DIR);
  ensureDir(EXPORT_DIR);

  const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    console.error(`❌ No .webm files found in ${VIDEOS_DIR}. Run demo_video_recorder.cjs first!`);
    process.exit(1);
  }

  console.log(`Found ${files.length} demo recording(s) to process.`);
  const results = [];

  for (const file of files) {
    const fullPath = path.join(VIDEOS_DIR, file);
    try {
      const res = processVideo(ffmpegPath, fullPath);
      results.push(res);
    } catch (err) {
      console.error(`❌ Error processing ${file}: ${err.message}`);
    }
  }

  console.log('\n======================================================');
  console.log('📊 GTM EXPORT SUMMARY TABLE:');
  console.log('------------------------------------------------------');
  results.forEach(r => {
    console.log(` • ${r.baseName.padEnd(44)} | MP4: ${formatBytes(r.mp4Size).padStart(9)} | GIF: ${formatBytes(r.gifSize).padStart(9)} [${r.underLimit ? 'OK (<5MB)' : 'FAIL'}]`);
  });
  console.log('======================================================');
  console.log(`✨ All outputs saved to: ${EXPORT_DIR}`);
}

main();
