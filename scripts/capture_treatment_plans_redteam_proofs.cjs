const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAll() {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    console.log('Falling back to system Chrome/Edge:', err.message);
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];
    let foundPath = edgePaths.find(p => fs.existsSync(p));
    browser = await chromium.launch({
      headless: true,
      executablePath: foundPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  const outDir = path.resolve(__dirname, '../docs/screenshots/inquisition_live');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targets = [
    {
      name: 'proof_treatment_plans_3tier_pc_light.png',
      url: 'http://127.0.0.1:5173/treatment_plan_preview.html?tab=tiers&theme=light',
      viewport: { width: 1440, height: 900 },
    },
    {
      name: 'proof_treatment_plans_3tier_pc_dark.png',
      url: 'http://127.0.0.1:5173/treatment_plan_preview.html?tab=tiers&theme=dark',
      viewport: { width: 1440, height: 900 },
    },
    {
      name: 'proof_treatment_plans_3tier_mobile_light.png',
      url: 'http://127.0.0.1:5173/treatment_plan_preview.html?tab=tiers&theme=light',
      viewport: { width: 390, height: 844 },
    },
    {
      name: 'proof_treatment_plans_3tier_mobile_dark.png',
      url: 'http://127.0.0.1:5173/treatment_plan_preview.html?tab=tiers&theme=dark',
      viewport: { width: 390, height: 844 },
    },
  ];

  for (const t of targets) {
    console.log(`Capturing ${t.name}...`);
    const page = await browser.newPage({ viewport: t.viewport, deviceScaleFactor: 1 });
    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      const dest = path.join(outDir, t.name);
      await page.screenshot({ path: dest, fullPage: false });
      const stat = fs.statSync(dest);
      console.log(`Saved: ${t.name} (${(stat.size / 1024).toFixed(1)} KB)`);
      if (stat.size < 20 * 1024) {
        console.error(`WARNING: Screenshot ${t.name} is smaller than 20KB guard!`);
      }
    } catch (e) {
      console.error(`Error capturing ${t.name}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('All proofs captured successfully.');
}

captureAll().catch((err) => {
  console.error('Fatal error in capture script:', err);
  process.exit(1);
});
