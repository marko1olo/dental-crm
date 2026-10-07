const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:5173/cashier_payroll_preview.html?view=z_report&theme=light');
  await page.waitForTimeout(1000);
  const tabInfo = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="shift-close-zreport-modal"] .overflow-x-auto');
    const btns = Array.from(document.querySelectorAll('[data-testid="shift-close-zreport-modal"] button'));
    return {
      container: container ? {
        tag: container.tagName,
        className: container.className,
        display: window.getComputedStyle(container).display,
        rect: container.getBoundingClientRect()
      } : null,
      btns: btns.map(b => ({
        text: b.innerText.slice(0, 20),
        className: b.className,
        pos: window.getComputedStyle(b).position,
        display: window.getComputedStyle(b).display,
        width: window.getComputedStyle(b).width,
        rect: b.getBoundingClientRect()
      }))
    };
  });
  console.log('TAB INFO:', JSON.stringify(tabInfo, null, 2));
  await browser.close();
})();
