import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const APP_BASE = 'http://127.0.0.1:5173';
const OUT_DIR = path.resolve(process.cwd(), 'docs/proofs/telephony');
fs.mkdirSync(OUT_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('=== CAPTURING GENUINE TELEPHONY SCREENSHOTS VIA STANDALONE HARNESS ===');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    // ----------------------------------------------------
    // 1. Desktop Light (1440x900) - Incoming Call Card & Audio Player
    // ----------------------------------------------------
    console.log('[1/4] Capturing 01_pc_telephony_incoming_call_light_1440x900.png ...');
    const ctx1 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
    });
    const page1 = await ctx1.newPage();
    await page1.addInitScript(() => {
      localStorage.setItem('dente_theme', 'light');
      localStorage.setItem('dente_theme_mode', 'light');
    });

    await page1.goto(`${APP_BASE}/?telephony=1`, { waitUntil: 'commit', timeout: 15000 });
    await page1.waitForSelector('[data-testid="telephony-standalone-workspace"]', { timeout: 15000 });
    await wait(1500);

    // Make sure light theme classes are applied
    await page1.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className = 'light';
    });
    await wait(800);

    const shot1 = path.join(OUT_DIR, '01_pc_telephony_incoming_call_light_1440x900.png');
    await page1.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved: ${shot1} (${fs.statSync(shot1).size} bytes)`);
    await ctx1.close();

    // ----------------------------------------------------
    // 2. Desktop Light (1440x900) - Softphone Dialer Modal
    // ----------------------------------------------------
    console.log('[2/4] Capturing 02_pc_telephony_dialer_modal_light_1440x900.png ...');
    const ctx2 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
    });
    const page2 = await ctx2.newPage();
    await page2.addInitScript(() => {
      localStorage.setItem('dente_theme', 'light');
      localStorage.setItem('dente_theme_mode', 'light');
    });

    await page2.goto(`${APP_BASE}/?telephony=1&dialer=1`, { waitUntil: 'commit', timeout: 15000 });
    await page2.waitForSelector('[data-testid="telephony-standalone-workspace"]', { timeout: 15000 });
    await wait(1500);

    await page2.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className = 'light';
    });
    await wait(800);

    const shot2 = path.join(OUT_DIR, '02_pc_telephony_dialer_modal_light_1440x900.png');
    await page2.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved: ${shot2} (${fs.statSync(shot2).size} bytes)`);
    await ctx2.close();

    // ----------------------------------------------------
    // 3. Desktop Dark (1440x900) - Telephony in Dark Mode
    // ----------------------------------------------------
    console.log('[3/4] Capturing 03_pc_telephony_dark_1440x900.png ...');
    const ctx3 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
    });
    const page3 = await ctx3.newPage();
    await page3.addInitScript(() => {
      localStorage.setItem('dente_theme', 'dark');
      localStorage.setItem('dente_theme_mode', 'dark');
    });

    await page3.goto(`${APP_BASE}/?telephony=1`, { waitUntil: 'commit', timeout: 15000 });
    await page3.waitForSelector('[data-testid="telephony-standalone-workspace"]', { timeout: 15000 });
    await wait(1500);

    await page3.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.className = 'dark';
    });
    await wait(800);

    const shot3 = path.join(OUT_DIR, '03_pc_telephony_dark_1440x900.png');
    await page3.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved: ${shot3} (${fs.statSync(shot3).size} bytes)`);
    await ctx3.close();

    // ----------------------------------------------------
    // 4. Mobile Light (390x844) - Mobile View
    // ----------------------------------------------------
    console.log('[4/6] Capturing 04_mobile_telephony_light_390x844.png ...');
    const ctx4 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
    });
    const page4 = await ctx4.newPage();
    await page4.addInitScript(() => {
      localStorage.setItem('dente_theme', 'light');
      localStorage.setItem('dente_theme_mode', 'light');
    });

    await page4.goto(`${APP_BASE}/?telephony=1`, { waitUntil: 'commit', timeout: 15000 });
    await page4.waitForSelector('[data-testid="telephony-standalone-workspace"]', { timeout: 15000 });
    await wait(1500);

    await page4.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className = 'light';
    });
    await wait(800);

    const shot4 = path.join(OUT_DIR, '04_mobile_telephony_light_390x844.png');
    await page4.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved: ${shot4} (${fs.statSync(shot4).size} bytes)`);
    await ctx4.close();

    // ----------------------------------------------------
    // 5. Mobile Dark (390x844) - Mobile Dark View
    // ----------------------------------------------------
    console.log('[5/6] Capturing 04_mobile_telephony_dark_390x844.png ...');
    const ctx5 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark',
    });
    const page5 = await ctx5.newPage();
    await page5.addInitScript(() => {
      localStorage.setItem('dente_theme', 'dark');
      localStorage.setItem('dente_theme_mode', 'dark');
    });

    await page5.goto(`${APP_BASE}/?telephony=1`, { waitUntil: 'commit', timeout: 15000 });
    await page5.waitForSelector('[data-testid="telephony-standalone-workspace"]', { timeout: 15000 });
    await wait(1500);

    await page5.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.className = 'dark';
    });
    await wait(800);

    const shot5 = path.join(OUT_DIR, '04_mobile_telephony_dark_390x844.png');
    await page5.screenshot({ path: shot5, fullPage: false });
    console.log(`Saved: ${shot5} (${fs.statSync(shot5).size} bytes)`);
    await ctx5.close();

    // ----------------------------------------------------
    // 6. Incoming Call Popup Detailed Element Screenshot
    // ----------------------------------------------------
    console.log('[6/6] Capturing 05_telephony_popup_incoming_call.png ...');
    const ctx6 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
    });
    const page6 = await ctx6.newPage();
    await page6.addInitScript(() => {
      localStorage.setItem('dente_theme', 'light');
      localStorage.setItem('dente_theme_mode', 'light');
    });

    await page6.goto(`${APP_BASE}/?telephony=1`, { waitUntil: 'commit', timeout: 15000 });
    await page6.waitForSelector('[data-testid="incoming-call-popup"]', { timeout: 15000 });
    await wait(1000);

    const popupEl = await page6.$('[data-testid="incoming-call-popup"]');
    const shot6 = path.join(OUT_DIR, '05_telephony_popup_incoming_call.png');
    if (popupEl) {
      await popupEl.screenshot({ path: shot6 });
      console.log(`Saved element popup: ${shot6} (${fs.statSync(shot6).size} bytes)`);
    } else {
      await page6.screenshot({ path: shot6, fullPage: false });
      console.log(`Saved fallback popup: ${shot6} (${fs.statSync(shot6).size} bytes)`);
    }
    await ctx6.close();

    // Also mirror canonical numbered aliases
    fs.copyFileSync(shot1, path.join(OUT_DIR, '01_telephony_pc_light_1440x900.png'));
    fs.copyFileSync(shot3, path.join(OUT_DIR, '02_telephony_pc_dark_1440x900.png'));
    fs.copyFileSync(shot4, path.join(OUT_DIR, '03_telephony_mobile_light_390x844.png'));
    fs.copyFileSync(shot5, path.join(OUT_DIR, '04_telephony_mobile_dark_390x844.png'));

    console.log('=== ALL GENUINE TELEPHONY SCREENSHOTS CAPTURED & MIRRORED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Screenshot capture error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
