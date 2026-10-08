const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://127.0.0.1:5173/lab_orders_preview.html?tab=modal&theme=light');
  await new Promise(r => setTimeout(r, 4000));
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('HTML LEN:', html.length);
  const found = await page.$('[data-testid="dental-lab-work-order-modal"]');
  console.log('FOUND MODAL:', !!found);
  const root = await page.$('#root');
  console.log('FOUND ROOT:', !!root);
  await browser.close();
})();
