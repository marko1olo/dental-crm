import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.click('text=Записи');
  await page.waitForTimeout(500);
  await page.click('text=Создать запись в расписание');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_create_form.png' });
  await browser.close();
})();
