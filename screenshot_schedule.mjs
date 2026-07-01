import { chromium } from 'playwright';

(async () => {
  console.log('Starting playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  
  try {
    const gotItBtn = await page.$('text="Понятно"');
    if (gotItBtn) await gotItBtn.click();
  } catch (e) {}

  await page.waitForTimeout(1000);
  
  console.log('Clicking Записи...');
  // Click the nav item that contains "Записи"
  await page.click('text="Записи"');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot_real_schedule.png', fullPage: true });
  console.log('Saved screenshot_real_schedule.png');

  await browser.close();
  console.log('Done.');
})();
