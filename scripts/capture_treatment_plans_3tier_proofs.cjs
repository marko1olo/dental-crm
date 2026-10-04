const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const outDir = path.resolve(__dirname, '../docs/screenshots/inquisition_live');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop Light (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
    page.on('response', resp => {
      if (resp.status() >= 400) console.log('HTTP ERROR:', resp.status(), resp.url());
    });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=light', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML);
    console.log('ROOT HTML LENGTH:', rootHtml ? rootHtml.length : 0);
    console.log('ROOT HTML SAMPLE:', rootHtml ? rootHtml.substring(0, 300) : 'null');
    const dest = path.join(outDir, 'proof_treatment_plans_3tier_light.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved Light Proof:', dest);
    await page.close();
  }

  // 2. Desktop Dark (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, 'proof_treatment_plans_3tier_dark.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved Dark Proof:', dest);
    await page.close();
  }

  await browser.close();
  console.log('Screenshot capture completed successfully.');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
