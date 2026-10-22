/**
 * captureCashboxScreenshots.mjs
 * 4-State Red Team Visual Proof for FastCheckoutModal & Cashier 54-FZ.
 * Mandate 8am & Apple HIG Touch Ergonomics.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PREVIEW_URL = `${BASE_URL}/checkout-preview.html`;
const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/388df89f-157a-4f6f-8849-8213afd4c358';
const PROOFS_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/finance';
const PUBLIC_DIR = 'C:/Clinic_MVP/dental-crm/apps/web/public/screenshots';

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

async function main() {
  console.log(`[VITE] Spawning Vite dev server on port ${PORT}...`);
  const viteProcess = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: 'C:/Clinic_MVP/dental-crm/apps/web',
    shell: true,
    stdio: 'pipe',
  });

  viteProcess.stderr?.on('data', (d) => {
    const s = d.toString();
    if (!s.includes('warning') && !s.includes('deprecated')) {
      console.log('[VITE STDERR]:', s.trim());
    }
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(PREVIEW_URL);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!ready) {
    console.error('[ERROR] Vite server failed to boot.');
    viteProcess.kill();
    process.exit(1);
  }

  console.log(`[VITE READY] Dev server active at ${PREVIEW_URL}`);

  let browser;
  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  } catch (err) {
    console.error('[ERROR] Failed to launch browser:', err);
    viteProcess.kill();
    process.exit(1);
  }

  const states = [
    { name: 'pc_light', filename: 'fast_checkout_pc_light_1440x900.png', width: 1440, height: 900, isMobile: false, theme: 'light' },
    { name: 'pc_dark', filename: 'fast_checkout_pc_dark_1440x900.png', width: 1440, height: 900, isMobile: false, theme: 'dark' },
    { name: 'mobile_light', filename: 'fast_checkout_mobile_light_390x844.png', width: 390, height: 844, isMobile: true, theme: 'light' },
    { name: 'mobile_dark', filename: 'fast_checkout_mobile_dark_390x844.png', width: 390, height: 844, isMobile: true, theme: 'dark' },
  ];

  try {
    for (const st of states) {
      console.log(`\n[CAPTURE] Rendering state: ${st.name} (${st.width}x${st.height}, isMobile=${st.isMobile}, theme=${st.theme})...`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        isMobile: st.isMobile,
        hasTouch: st.isMobile,
        deviceScaleFactor: 2,
      });

      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error(`[CONSOLE ERROR ${st.name}]:`, msg.text());
        }
      });
      page.on('pageerror', (err) => {
        console.error(`[PAGE ERROR ${st.name}]:`, err.message);
      });
      page.on('requestfailed', (req) => {
        console.error(`[REQ FAILED ${st.name}]:`, req.url(), req.failure()?.errorText);
      });

      await page.route('**/api/**', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, status: 'ready', items: [] }),
        });
      });

      await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

      try {
        await page.waitForSelector('.fast-checkout-modal-container', { timeout: 10000 });
        console.log('[MODAL READY] Found .fast-checkout-modal-container');
      } catch (err) {
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log('[DOM SNAPSHOT]:', html.slice(0, 1000));
        throw err;
      }

      // Theme application assurance
      await page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        if (themeName === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          document.body.classList.add('dark');
          document.body.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
          document.body.classList.add('light');
          document.body.classList.remove('dark');
        }
      }, st.theme);

      await page.waitForTimeout(500);

      const filename = `screenshot_${st.name}.png`;
      const canonicalFilename = st.filename;
      const brainPath = path.join(BRAIN_DIR, filename);
      await page.screenshot({ path: brainPath, fullPage: false });
      console.log(`[SAVED] ${brainPath}`);

      copyFileSync(brainPath, path.join(PROOFS_DIR, filename));
      copyFileSync(brainPath, path.join(PROOFS_DIR, canonicalFilename));
      copyFileSync(brainPath, path.join(PUBLIC_DIR, filename));
      copyFileSync(brainPath, path.join(PUBLIC_DIR, canonicalFilename));

      await context.close();
    }
  } finally {
    await browser.close();
    console.log('[BROWSER CLOSED]');
    viteProcess.kill('SIGTERM');
    console.log('[VITE PROCESS TERMINATED]');
  }

  console.log('\n[ALL 4-STATE SCREENSHOTS CAPTURED SUCCESSFULLY]');
}

main().catch((err) => {
  console.error('[CAPTURE ERROR]:', err);
  process.exit(1);
});
