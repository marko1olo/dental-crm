import { chromium } from 'playwright';
import path from 'path';

const APP_URL = 'http://127.0.0.1:5173';
const OUT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\19527560-fbad-4059-97a2-76c3b38db9cc\\scratch';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const tabs = [
    { name: 'Schedule', hash: '#schedule' },
    { name: 'Patients', hash: '#patients' },
    { name: 'Visit', hash: '#visit' },
    { name: 'Finance', hash: '#finance' },
    { name: 'Settings', hash: '#settings' }
  ];

  for (const tab of tabs) {
    try {
      const url = `${APP_URL}/${tab.hash}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2500); // Extra wait for React render
      const screenshotPath = path.join(OUT_DIR, `audit_${tab.name.toLowerCase()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved ${screenshotPath}`);
    } catch (e) {
      console.log(`Failed to capture ${tab.name}: ${e.message}`);
    }
  }

  await browser.close();
}

run().catch(console.error);
