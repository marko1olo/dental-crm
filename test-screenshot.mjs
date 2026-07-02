
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

  // wait a bit for initial render
  await page.waitForTimeout(2000);

  // attempt to click 'Снимки' or find the patient panel
  // Just take a screenshot first to see where we are
  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/19527560-fbad-4059-97a2-76c3b38db9cc/documents_view_screenshot_' + Date.now() + '.png', fullPage: true });

  await browser.close();
})();

