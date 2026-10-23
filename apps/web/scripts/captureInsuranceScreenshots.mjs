/**
 * captureInsuranceScreenshots.mjs
 * 4-State Red Team Visual Proof for DmsGuaranteeLetterModal & DmsRegistryExportModal.
 * Mandate 8am & Apple HIG Touch Ergonomics.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/96ef30db-4ea3-48b9-a458-0904c66a4516';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/insurance';
const PUBLIC_DIR = 'C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/insurance';

for (const dir of [BRAIN_DIR, PROOFS_DIR, PUBLIC_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const executablePath = edgePaths.find((p) => existsSync(p));
if (!executablePath) {
  console.error('[ERROR] No Chromium/Edge browser found.');
  process.exit(1);
}

async function findLiveBaseUrl() {
  for (const port of [5174, 5173, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/insurance-preview.html`);
      if (res.ok) {
        console.log(`[VITE] Found live Vite server on port ${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch {}
  }
  return null;
}

async function main() {
  console.log('[VITE] Detecting live Vite dev server...');
  let baseUrl = await findLiveBaseUrl();
  let viteProcess = null;

  if (!baseUrl) {
    console.log('[VITE] Spawning Vite dev server on port 5173...');
    viteProcess = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
      cwd: 'C:/Clinic_MVP/dental-crm/apps/web',
      shell: true,
      stdio: 'pipe',
    });

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      baseUrl = await findLiveBaseUrl();
      if (baseUrl) break;
    }

    if (!baseUrl) {
      console.error('[ERROR] Vite dev server failed to start.');
      if (viteProcess) viteProcess.kill();
      process.exit(1);
    }
  }

  const PREVIEW_URL = `${baseUrl}/insurance-preview.html`;

  console.log('[PLAYWRIGHT] Launching browser at:', executablePath);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  const states = [
    {
      name: 'pc-light-insurance-guarantee-letter.png',
      width: 1440,
      height: 900,
      isMobile: false,
      colorScheme: 'light',
      url: PREVIEW_URL,
    },
    {
      name: 'pc-dark-insurance-guarantee-letter.png',
      width: 1440,
      height: 900,
      isMobile: false,
      colorScheme: 'dark',
      url: PREVIEW_URL,
    },
    {
      name: 'mobile-light-insurance-guarantee-letter.png',
      width: 390,
      height: 844,
      isMobile: true,
      colorScheme: 'light',
      url: PREVIEW_URL,
    },
    {
      name: 'mobile-dark-insurance-guarantee-letter.png',
      width: 390,
      height: 844,
      isMobile: true,
      colorScheme: 'dark',
      url: PREVIEW_URL,
    },
    {
      name: 'pc-light-dms-registry-export.png',
      width: 1440,
      height: 900,
      isMobile: false,
      colorScheme: 'light',
      url: `${PREVIEW_URL}?mode=registry`,
    },
    {
      name: 'mobile-light-dms-registry-export.png',
      width: 390,
      height: 844,
      isMobile: true,
      colorScheme: 'light',
      url: `${PREVIEW_URL}?mode=registry`,
    },
  ];

  for (const st of states) {
    console.log(`[CAPTURING] ${st.name} (${st.width}x${st.height}, ${st.colorScheme})...`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      colorScheme: st.colorScheme,
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      deviceScaleFactor: st.isMobile ? 2 : 1,
    });

    const page = await context.newPage();
    await page.goto(st.url, { waitUntil: 'networkidle' });

    await page.evaluate((theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }, st.colorScheme);

    await page.waitForTimeout(600);

    const proofPath = path.join(PROOFS_DIR, st.name);
    await page.screenshot({ path: proofPath, fullPage: false });
    console.log(`[SAVED] -> ${proofPath}`);

    const publicPath = path.join(PUBLIC_DIR, st.name);
    copyFileSync(proofPath, publicPath);

    const brainPath = path.join(BRAIN_DIR, st.name);
    copyFileSync(proofPath, brainPath);

    await context.close();
  }

  await browser.close();
  if (viteProcess) {
    viteProcess.kill();
  }
  console.log('[SUCCESS] All 4-state Red Team screenshots captured cleanly.');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
