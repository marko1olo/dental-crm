import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const NOW = new Date().toISOString();
const LOCALSTORAGE_SEED = {
  'dente_clinic_token': 'audit-bypass-token',
  'dente_staff_token': 'audit-bypass-staff',
  'dental-crm:web-ui-preferences:v1': JSON.stringify({
    version: 1,
    onboardingDismissed: true,
    onboardingDraftMode: false,
    onboardingStep: 'done',
    onboardingDismissedAt: NOW,
    savedAt: NOW
  })
};

const VIEWPORTS = [
  { name: 'visit_mobile', width: 375, height: 812, hasTouch: true, isMobile: true },
  { name: 'visit_pc', width: 1440, height: 900, hasTouch: false, isMobile: false }
];

const THEMES = ['light', 'dark'];

async function run() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });

  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/e1a85de0-5463-4dad-9cfd-a687decd3eb2';
  const url = 'http://127.0.0.1:5173/visit/00000000-0000-0000-0000-000000000005';

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, hasTouch: vp.hasTouch, isMobile: vp.isMobile });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      
      await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
      
      await page.evaluate((seed) => {
        for (const [k, v] of Object.entries(seed)) {
          localStorage.setItem(k, v);
        }
      }, LOCALSTORAGE_SEED);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 6000)); // allow models/renders to settle

      // Force HTML class to theme just in case OS preference doesn't apply immediately
      await page.evaluate((t) => {
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);

      await new Promise(r => setTimeout(r, 500));

      const screenshotPath = path.join(outDir, `${vp.name}_${theme}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved ${screenshotPath}`);

      await page.close();
    }
  }

  await browser.close();
}

run().catch(console.error);
