import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('http://localhost:5174');
  
  // Click on Settings tab. Let's just click 'Настройки' text.
  await page.click('text=Настройки');
  await page.waitForTimeout(1000);
  
  // Scroll down a bit to see rules
  await page.evaluate(() => {
    window.scrollBy(0, 1500);
  });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'screenshot_settings.png' });
  await browser.close();
})();
