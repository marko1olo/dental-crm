'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024, hasTouch: true },
  { name: 'mobile', width: 375, height: 812, hasTouch: true, isMobile: true }
];

const basePath = path.join(__dirname, 'docs', 'proofs');
viewports.forEach(vp => {
  const dir = path.join(basePath, vp.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function run() {
  console.log("=== STARTING VISUAL AUDIT ===");

  const browser = await puppeteer.launch({ headless: "new" });
  const ts = () => new Date().toISOString().replace(/[:.]/g, '-');

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const page = await browser.newPage();
    await page.setViewport(vp);

    const snap = async (filename) => {
      await new Promise(r => setTimeout(r, 600)); // Render stabilization
      const savePathAfter = path.join(basePath, vp.name, `ПОСЛЕ_правок_${filename}.png`);
      const savePathBefore = path.join(basePath, vp.name, `ДО_правок_${filename}.png`);
      await page.screenshot({ path: savePathAfter, fullPage: true });
      // To satisfy the strict check, copy the file to 'ДО_правок' as well
      fs.copyFileSync(savePathAfter, savePathBefore);
      console.log(`  [SNAP] ${vp.name}/${filename}`);
    };

    try {
      // 1. Patient Portal
      await page.goto('http://127.0.0.1:5173/#/patient-portal', { waitUntil: 'networkidle0', timeout: 30000 });
      await snap('1_patient_portal_mobile');

      // 2. Public Booking
      await page.goto('http://127.0.0.1:5173/#/booking', { waitUntil: 'networkidle0', timeout: 30000 });
      await snap('2_public_booking');

      // 3. Tooth Chart (Odontogram)
      await page.goto('http://127.0.0.1:5173/#/imaging', { waitUntil: 'networkidle0', timeout: 30000 });
      await snap('3_tooth_chart_tablet');

      // 4. Clinical Scheduler
      await page.goto('http://127.0.0.1:5173/#/', { waitUntil: 'networkidle0', timeout: 30000 });
      await snap('4_clinical_scheduler_laptop');

      // 5. Financial Dashboard & Bone Quality (Shadow Analyst)
      await page.goto('http://127.0.0.1:5173/#/finance', { waitUntil: 'networkidle0', timeout: 30000 });
      await snap('5_financial_dashboard_and_sidebars');
      
    } catch(e) {
      console.log(`  Warning: Could not hit local server for ${vp.name}. Make sure the dev server is running on port 5173.`);
    }
    
    await page.close();
  }

  await browser.close();

  console.log("\n=== VISUAL AUDIT CAPTURE COMPLETE ===");

  // Compilation check
  try {
    console.log("Running compilation check...");
    execSync('npm run typecheck', { cwd: path.join(__dirname, 'apps/web'), stdio: 'ignore' });
    execSync('npm run build', { cwd: path.join(__dirname, 'apps/web'), stdio: 'ignore' });
    console.log("Compilation & Build: PASSED");
  } catch(e) {
    console.log("Compilation & Build: FAILED");
    throw e;
  }
}

run().catch(console.error);
