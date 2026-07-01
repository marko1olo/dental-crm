const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const views = ['shift', 'schedule', 'visit', 'patients', 'documents', 'communications', 'settings'];

  for (const view of views) {
    await page.evaluate((v) => { window.location.hash = v; }, view);
    await page.waitForTimeout(1500); // give it time to render
    await page.screenshot({ path: `screenshots/audit_${view}.png`, fullPage: true });
  }

  await browser.close();
})();
