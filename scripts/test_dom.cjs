const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:5173/#/portal/booking/dce70000-546f-4147-878f-3bcf77790001', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const btn = page.locator('button:has-text("Кабинет пациента")');
  console.log('Cabinet button count:', await btn.count());
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(800);
    const outPath = path.resolve(__dirname, '..', 'docs', 'screenshots', 'audit_patients_booking', 'test_cabinet_pc_light.png');
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved test screenshot to:', outPath);
  }
  await browser.close();
})();
