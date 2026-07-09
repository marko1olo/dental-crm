const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.addInitScript(() => {
    localStorage.setItem('dente_staff_token', 'mock_token_for_testing');
    window.__TEST_MODE__ = true;
  });

  await page.goto('http://127.0.0.1:5173/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  
  await page.evaluate(() => { window.location.hash = '#/odontogram'; });
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  const file = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1a85de0-5463-4dad-9cfd-a687decd3eb2\\ToothChart_FINAL_VERIFY.png';
  await page.screenshot({ path: file });
  console.log(`Saved screenshot to ${file}`);
  
  await browser.close();
})();
