import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve(process.cwd(), 'docs/proofs/perio');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('=== CAPTURING CANONICAL PERIO SCREENSHOTS ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('dental_token', 'dev-test-token');
      localStorage.setItem('dental_current_user', JSON.stringify({ role: 'doctor', id: 'doc-1', name: 'Воронов А.В.' }));
      localStorage.setItem('dente_active_perspective', 'chairsider');
      localStorage.setItem('dente_theme', 'light');
      localStorage.setItem('dente_onboarding_completed', 'true');
      localStorage.setItem('dente_tour_completed', 'true');
      localStorage.setItem('dente_demo_showcase', 'true');
    });

    // 1. Desktop Light (1440x900) - Perio Chart
    console.log('[1/4] Capturing 01_pc_perio_chart_light_1440x900.png ...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5173/?perio=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-testid="perio-standalone-workspace"]', { visible: true, timeout: 30000 });

    await page.evaluate(() => {
      localStorage.setItem('dente_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    });
    await sleep(2000);

    const shot1 = path.join(OUT_DIR, '01_pc_perio_chart_light_1440x900.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved: ${shot1} (${fs.statSync(shot1).size} bytes)`);

    // 2. Desktop Light (1440x900) - Pocket Depth Modal
    console.log('[2/4] Capturing 02_pc_perio_pocket_modal_light_1440x900.png ...');
    await page.goto('http://127.0.0.1:5173/?perio=pocket', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-testid="periodontal-pocket-depth-modal"]', { visible: true, timeout: 30000 });

    await page.evaluate(() => {
      localStorage.setItem('dente_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    });
    await sleep(2000);

    const shot2 = path.join(OUT_DIR, '02_pc_perio_pocket_modal_light_1440x900.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved: ${shot2} (${fs.statSync(shot2).size} bytes)`);

    // 3. Desktop Dark (1440x900) - Perio Chart
    console.log('[3/4] Capturing 03_pc_perio_chart_dark_1440x900.png ...');
    await page.goto('http://127.0.0.1:5173/?perio=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-testid="perio-standalone-workspace"]', { visible: true, timeout: 30000 });

    await page.evaluate(() => {
      localStorage.setItem('dente_theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.setAttribute('data-theme', 'dark');
    });
    await sleep(2000);

    const shot3 = path.join(OUT_DIR, '03_pc_perio_chart_dark_1440x900.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved: ${shot3} (${fs.statSync(shot3).size} bytes)`);

    // 4. Mobile Light (390x844) - Perio Chart
    console.log('[4/4] Capturing 04_mobile_perio_light_390x844.png ...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:5173/?perio=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-testid="perio-standalone-workspace"]', { visible: true, timeout: 30000 });

    await page.evaluate(() => {
      localStorage.setItem('dente_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    });
    await sleep(2000);

    const shot4 = path.join(OUT_DIR, '04_mobile_perio_light_390x844.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved: ${shot4} (${fs.statSync(shot4).size} bytes)`);

    console.log('=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Error capturing proofs:', err);
  process.exit(1);
});
