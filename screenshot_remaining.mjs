import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('http://localhost:5174');
  
  await page.click('text=Снимки');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_imaging.png' });
  
  await page.click('text=Оплаты');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_finance.png' });
  
  await page.click('text=Связь');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_communications.png' });
  
  await page.click('text=Маркетинг/SEO');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_marketing.png' });
  
  await browser.close();
})();
