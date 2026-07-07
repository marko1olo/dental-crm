const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  page.on('console', msg => console.log(msg.text())); await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(8000);
  
  // Click Odontogram tab (which is #/odontogram)
  await page.evaluate(() => { window.location.hash = '#/odontogram'; });
  await page.waitForTimeout(1000);
  
  // Open popup for Tooth 46
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.tooth-number')).find(el => el.textContent === '46');
    if (el) {
       el.parentElement.click();
    }
  });
  
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:/Clinic_MVP/dental-crm/docs/proofs/desktop/light/odontogram_test.png', fullPage: true });
  await browser.close();
})();
