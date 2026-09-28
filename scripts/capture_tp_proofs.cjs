const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const outDir = path.resolve(__dirname, '../docs/screenshots/subagent6');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop Light (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=light', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, 'treatment_plan_desktop_light.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved:', dest);
    await page.close();
  }

  // 2. Desktop Dark (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, 'treatment_plan_desktop_dark.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved:', dest);
    await page.close();
  }

  // 3. Mobile Light (390x844)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=light', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, 'treatment_plan_mobile_light.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved:', dest);
    await page.close();
  }

  // 4. Mobile Dark (390x844)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, 'treatment_plan_mobile_dark.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Saved:', dest);
    await page.close();
  }

  await browser.close();
  console.log('Capture finished successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
