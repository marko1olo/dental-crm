const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto("http://127.0.0.1:5173/?cbct=demo#cbct", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const html = await page.evaluate(() => document.body.innerHTML.slice(0, 500));
  console.log('HTML SAMPLE:', html);
  await page.waitForSelector('[data-testid="cbct-studio-modal"], .cbct-dark-cockpit, canvas', { timeout: 25000 });
  console.log("SUCCESS: CBCT Modal found!");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_inquisition/test_cbct_render.png" });
  console.log("SUCCESS: Screenshot saved!");
  await browser.close();
})().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
