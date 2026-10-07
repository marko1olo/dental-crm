const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5173/cashier_payroll_preview.html?view=z_report&theme=light');
  await page.waitForTimeout(500);

  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button[aria-label="Закрыть модальное окно"]')).map(b => ({
      cls: b.className,
      disp: window.getComputedStyle(b).display,
      rect: b.getBoundingClientRect()
    }));
  });

  console.log('Close buttons count on mobile:', btns.length);
  console.log(JSON.stringify(btns, null, 2));

  await browser.close();
})();
