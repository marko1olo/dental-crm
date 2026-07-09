const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('http://localhost:5173/patient/1');
  await page.waitForLoadState('networkidle');
  
  // Click on odontogram tab
  await page.click('button:has-text("Зубная формула")');
  await page.waitForTimeout(500);
  
  // Inject CSS to make absolutely everything overflow: visible
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        overflow: visible !important;
        overflow-x: visible !important;
        overflow-y: visible !important;
      }
    `;
    document.head.appendChild(style);
  });
  
  // Wait a bit for render
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'ToothChart_OVERFLOW_VISIBLE.png' });
  await browser.close();
  console.log('Saved ToothChart_OVERFLOW_VISIBLE.png');
})();
