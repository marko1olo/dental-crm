import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.click('button:has-text(\Записи\)');
  await page.waitForTimeout(1000);
  await page.click('button:has-text(\Создать\)');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_create_form_final.png' });
  await browser.close();
})();
