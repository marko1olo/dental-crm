import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  const rects = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const result = [];
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      // Look for a small square-ish element in the bottom left quadrant
      if (rect.width > 0 && rect.width < 50 && rect.height > 0 && rect.height < 50 && rect.left < 100 && rect.top > 700) {
        result.push({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          html: el.outerHTML.substring(0, 100)
        });
      }
    }
    return result;
  });
  
  console.log("Suspicious elements:", rects);
  await browser.close();
})();
