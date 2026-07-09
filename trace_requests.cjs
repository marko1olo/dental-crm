const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('request', req => console.log('REQ:', req.method(), req.url()));
  page.on('response', res => console.log('RES:', res.status(), res.url()));
  page.on('console', msg => console.log('CON:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));

  console.log('Navigating...');
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
