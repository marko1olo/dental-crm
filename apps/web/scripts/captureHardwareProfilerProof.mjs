/**
 * captureHardwareProfilerProof.mjs — Live Playwright Visual Proof Capture
 * for Canonical Universal Hardware Profiler & CBCT Auto-Adaptation.
 *
 * Captures 4-State Visual Proof:
 * 1. Desktop Light (1440x900) — Hardware auto-adaptation sub-bar with GPU classification and CT downsampling.
 * 2. Desktop Dark (1440x900) — Dark theme contrast and token compliance.
 * 3. Mobile Light (390x844) — Touch-friendly ergonomics (>=44px touch targets).
 * 4. Mobile Dark (390x844) — Mobile dark theme.
 * 5. Interactive CBCT Tuner Modal (1440x900) — Real-time slice reconstruction with hardware tier badge.
 */

import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/hardware';
const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/afe1727b-0f74-4e1f-8ca3-2963f706debc';

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const executablePath = edgePaths.find((p) => existsSync(p));
if (!executablePath) {
  console.error('[ERROR] No Chromium/Edge browser found.');
  process.exit(1);
}

const DEV_URL = 'http://127.0.0.1:5173/hardware_profiler_preview.html';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function setupPage(page, theme) {
  await page.addInitScript(({ themeName }) => {
    localStorage.setItem('dente_theme_mode', themeName);
    localStorage.setItem('dente_tour_completed', 'true');
    localStorage.setItem('dente_quest_progress_v2', JSON.stringify({
      isDismissedPermanently: true,
      isTourActive: false,
    }));
    localStorage.setItem('dente_guide_tour_dismissed_v2', 'true');
    localStorage.setItem('dente_onboarding_dismissed', 'true');
  }, { themeName: theme });
}

const capturedScreenshots = [];

// 1. Desktop Light (1440x900)
console.log('Capturing 1. Desktop Light (1440x900)...');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page, 'light');
  await page.goto(`${DEV_URL}?theme=light`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const outPath = path.join(PROOFS_DIR, 'hardware_profiler_desktop_light.png');
  await page.screenshot({ path: outPath, fullPage: false });
  copyFileSync(outPath, path.join(BRAIN_DIR, 'hardware_profiler_desktop_light.png'));
  capturedScreenshots.push(outPath);
  await page.close();
}

// 2. Desktop Dark (1440x900)
console.log('Capturing 2. Desktop Dark (1440x900)...');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page, 'dark');
  await page.goto(`${DEV_URL}?theme=dark`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const outPath = path.join(PROOFS_DIR, 'hardware_profiler_desktop_dark.png');
  await page.screenshot({ path: outPath, fullPage: false });
  copyFileSync(outPath, path.join(BRAIN_DIR, 'hardware_profiler_desktop_dark.png'));
  capturedScreenshots.push(outPath);
  await page.close();
}

// 3. Mobile Light (390x844)
console.log('Capturing 3. Mobile Light (390x844)...');
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await setupPage(page, 'light');
  await page.goto(`${DEV_URL}?theme=light`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const outPath = path.join(PROOFS_DIR, 'hardware_profiler_mobile_light.png');
  await page.screenshot({ path: outPath, fullPage: false });
  copyFileSync(outPath, path.join(BRAIN_DIR, 'hardware_profiler_mobile_light.png'));
  capturedScreenshots.push(outPath);
  await page.close();
}

// 4. Mobile Dark (390x844)
console.log('Capturing 4. Mobile Dark (390x844)...');
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await setupPage(page, 'dark');
  await page.goto(`${DEV_URL}?theme=dark`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="doctor-cbct-preferences-card"]', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const outPath = path.join(PROOFS_DIR, 'hardware_profiler_mobile_dark.png');
  await page.screenshot({ path: outPath, fullPage: false });
  copyFileSync(outPath, path.join(BRAIN_DIR, 'hardware_profiler_mobile_dark.png'));
  capturedScreenshots.push(outPath);
  await page.close();
}

// 5. Interactive CBCT Tuner Modal (1440x900)
console.log('Capturing 5. Interactive CBCT Tuner Modal (1440x900)...');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page, 'dark');
  await page.goto(`${DEV_URL}?theme=dark`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="button-open-cbct-tuner"]', { state: 'visible', timeout: 15000 });
  await page.click('[data-testid="button-open-cbct-tuner"]');
  // Wait for tuner modal canvas or heading to render
  await page.waitForTimeout(2000);

  const outPath = path.join(PROOFS_DIR, 'hardware_profiler_cbct_tuner_modal.png');
  await page.screenshot({ path: outPath, fullPage: false });
  copyFileSync(outPath, path.join(BRAIN_DIR, 'hardware_profiler_cbct_tuner_modal.png'));
  capturedScreenshots.push(outPath);
  await page.close();
}

await browser.close();

console.log('\n--- AUDIT OF CAPTURED SCREENSHOTS ---');
const hashes = new Set();
for (const f of capturedScreenshots) {
  const stat = statSync(f);
  const buf = readFileSync(f);
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  console.log(`[PROOF] ${path.basename(f)}: size=${stat.size} bytes, md5=${hash}`);
  if (stat.size < 40000) {
    console.warn(`[WARNING] File size < 40KB: ${path.basename(f)} (${stat.size} bytes)`);
  }
  if (hashes.has(hash)) {
    console.error(`[ERROR] Duplicate MD5 hash detected: ${hash}`);
  }
  hashes.add(hash);
}
console.log(`Total unique screenshots: ${hashes.size} / ${capturedScreenshots.length}`);
