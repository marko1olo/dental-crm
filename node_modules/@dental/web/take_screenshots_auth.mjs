import { chromium } from 'playwright';
import path from 'path';
const APP_URL = 'http://127.0.0.1:5173';
const OUT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e413e738-71c0-4b21-884d-6f53c4ba6235\\scratch';
async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const tabs = [ { name: 'Schedule', hash: '#schedule' }, { name: 'Patients', hash: '#patients' }, { name: 'Visit', hash: '#visit' }, { name: 'Finance', hash: '#finance' }, { name: 'Settings', hash: '#settings' } ];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    try {
      const url = APP_URL + '/' + tab.hash;
      console.log('Navigating to ' + url + '...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const content = await page.content();
      if (content.includes('clinic@example.com') && await page.locator('input[type="text"]').count() > 0) {
        console.log('Detected login page, logging in...');
        await page.fill('input[type="text"]', 'clinic@example.com');
        await page.fill('input[type="password"]', 'dente2026');
        await page.click('button:has-text("¬ход в кабинет")');
        await page.waitForTimeout(3000);
      }
      if (!page.url().includes(tab.hash)) {
         await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
         await page.waitForTimeout(2000);
      } else {
         await page.waitForTimeout(1000);
      }
      const screenshotPath = path.join(OUT_DIR, 'audit_' + tab.name.toLowerCase() + '.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Saved ' + screenshotPath);
    } catch (e) {
      console.log('Failed to capture ' + tab.name + ': ' + e.message);
    }
  }
  await browser.close();
}
run().catch(console.error);
