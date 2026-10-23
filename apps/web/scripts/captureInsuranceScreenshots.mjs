/**
 * captureInsuranceScreenshots.mjs
 * 4-State Red Team Visual Proof for DmsGuaranteeLetterModal in LIVE APPLICATION (http://127.0.0.1:5173/?dms=true).
 * Zero standalone mockups / zero preview.html per supreme mandate.
 */

import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173/?dms=true';
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

async function main() {
  console.log('[PLAYWRIGHT] Connecting to live application at:', BASE_URL);
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
    },
    {
      name: 'pc-dark-insurance-guarantee-letter.png',
      width: 1440,
      height: 900,
      isMobile: false,
      colorScheme: 'dark',
    },
    {
      name: 'mobile-light-insurance-guarantee-letter.png',
      width: 390,
      height: 844,
      isMobile: true,
      colorScheme: 'light',
    },
    {
      name: 'mobile-dark-insurance-guarantee-letter.png',
      width: 390,
      height: 844,
      isMobile: true,
      colorScheme: 'dark',
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

    // Live auth hydration per Mandate 8wy
    await page.addInitScript(() => {
      window.localStorage.setItem('dente_clinic_token', 'demo-showcase-token-therapist');
      window.localStorage.setItem('dente_staff_token', 'demo-showcase-staff-token-therapist');
      window.localStorage.setItem('dente_demo_showcase_active', 'true');
      window.localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ onboardingDismissed: true }));
      window.localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true }));
      window.localStorage.setItem('dente_onboarding_strip_dismissed', 'true');
      window.localStorage.setItem('active_staff_user', JSON.stringify({ id: 'staff-1', name: 'Д-р Смирнов', role: 'therapist' }));
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

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

    await page.waitForSelector('.dms-modal-window', { timeout: 20000 });
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
  console.log('[SUCCESS] All live 4-state Red Team screenshots captured cleanly from http://127.0.0.1:5173/?dms=true.');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
