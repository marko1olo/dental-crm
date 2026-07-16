import { chromium } from 'playwright';
import path from 'path';

const APP_URL = 'http://127.0.0.1:5173';
const OUT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\19527560-fbad-4059-97a2-76c3b38db9cc\\scratch';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(APP_URL, { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // just capture whatever it is
  const screenshotPath = path.join(OUT_DIR, `audit_current2.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved ${screenshotPath}`);

  await browser.close();
}

run().catch(console.error);
