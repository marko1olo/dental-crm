import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  
  await page.click('a[href="#finance"]');
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
