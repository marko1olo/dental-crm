import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DOCS_DIR = 'C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_cross_screen_inquisition';
const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/39b40c06-e809-404b-a8da-2d95ef6698c2';

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  await page.addInitScript(({ t }) => {
    window.localStorage.setItem('dente_theme_mode', t);
    window.localStorage.setItem('dente_active_session_token', 'mock-session-token');
    window.localStorage.setItem('dente_user_role', 'doctor');
    window.localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done' }));
  }, { t: theme });
  await page.goto('http://127.0.0.1:5173/#prices', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.querySelector('main.boot-state'));
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, theme);
  await page.waitForTimeout(1000);
  const btn = page.locator('button:visible:has-text("Добавить услугу")').first();
  await btn.click({ force: true });
  await page.waitForSelector('.pricelist-form-drawer', { timeout: 8000 });
  await page.waitForTimeout(600);
  const filename = `02_pricelist_editor_mobile_${theme}.png`;
  const docPath = path.join(DOCS_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: docPath });
  fs.copyFileSync(docPath, brainPath);
  console.log('Saved:', filename);
  await ctx.close();
}
await browser.close();
console.log('Done mobile editor capture!');
