const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined
  });

  for (const item of [
    { view: 'z_report', theme: 'dark', isMobile: false },
    { view: 'cash_register', theme: 'dark', isMobile: true },
    { view: 'doctor_payroll_t51', theme: 'light', isMobile: false }
  ]) {
    const ctx = await browser.newContext({
      viewport: item.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
    });
    const page = await ctx.newPage();
    page.on('console', msg => console.log('PAGE LOG [' + item.view + ']:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR [' + item.view + ']:', err));
    
    await page.goto(`http://127.0.0.1:5173/cashier_payroll_preview.html?view=${item.view}&theme=${item.theme}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const info = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [data-testid*="modal"]');
      const root = document.getElementById('root');
      return {
        rootHtmlLen: root ? root.innerHTML.length : 0,
        modalFound: !!modal,
        modalRect: modal ? modal.getBoundingClientRect() : null,
        modalStyle: modal ? {
          display: window.getComputedStyle(modal).display,
          visibility: window.getComputedStyle(modal).visibility,
          opacity: window.getComputedStyle(modal).opacity,
          zIndex: window.getComputedStyle(modal).zIndex,
          color: window.getComputedStyle(modal).color,
          bg: window.getComputedStyle(modal).backgroundColor
        } : null
      };
    });
    console.log(`RESULT [${item.view} ${item.theme} isMobile=${item.isMobile}]:`, JSON.stringify(info));
    await ctx.close();
  }
  await browser.close();
})();
