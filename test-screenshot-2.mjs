
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

  // wait a bit for initial render
  await page.waitForTimeout(2000);

  // attempt to click 'Снимки' in the nav
  const navLinks = await page.locator('nav a, nav button').allTextContents();
  console.log('Nav links found:', navLinks);
  
  try {
    await page.getByRole('link', { name: /Снимки/i }).click();
    await page.waitForTimeout(1000);
  } catch (e) {
    try {
      await page.getByRole('button', { name: /Снимки/i }).click();
      await page.waitForTimeout(1000);
    } catch (err) {}
  }

  // Click on the first image in the list to trigger the main view
  try {
    await page.locator('.imaging-row-select').first().click();
    await page.waitForTimeout(500);
  } catch (e) {
    console.log('No images found to select');
  }

  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/19527560-fbad-4059-97a2-76c3b38db9cc/documents_view_screenshot_' + Date.now() + '.png', fullPage: true });

  await browser.close();
})();

