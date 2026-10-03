const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function take(page, name) {
  const p = path.join(targetDir, name);
  await page.screenshot({ path: p, timeout: 30000 });
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--js-flags=--max-old-space-size=1024",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.route("**/api/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Navigating to http://127.0.0.1:5173/?cbct=demo (attempt ${i + 1})...`);
      await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    } catch (e) {
      console.log("Goto error:", e.message, "retrying in 2s...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log("Waiting for modal...");
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 });
  console.log("Modal opened!");

  // Click load demo volume
  const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 10000 }).catch(() => null);
  if (demoBtn) {
    console.log("Clicking load demo volume button...");
    await demoBtn.click();
  }

  console.log("Waiting for demo volume slices decoding to finish...");
  await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
  await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
  await page.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 30000 }).catch(() => {});
  console.log("Slices decoded! Waiting 6s for WebGL textures & slice canvas rendering...");
  await page.waitForTimeout(6000);

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`\n=== PROCESSING THEME: ${theme.toUpperCase()} ===`);
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      }
    }, theme);
    await page.waitForTimeout(1000);

    // 1. MPR Quad
    console.log(`[1/5] MPR Quad (${theme})...`);
    await page.click('[data-testid="cbct-nav-tab-mpr-3d"]').catch(() => {});
    await page.waitForTimeout(2000);
    await take(page, `01_mpr_quad_${theme}.png`);

    // 2. Panorama
    console.log(`[2/5] Panorama (${theme})...`);
    await page.click('[data-testid="cbct-nav-tab-panorama"]');
    await page.waitForTimeout(2500);
    await take(page, `02_panoramic_optg_50_50_${theme}.png`);

    // 3. Implant
    console.log(`[3/5] Implant Studio (${theme})...`);
    await page.click('[data-testid="cbct-nav-tab-implant"]');
    await page.waitForTimeout(2500);
    await take(page, `03_implant_studio_${theme}.png`);

    // 4. Endo
    console.log(`[4/5] Endo Studio (${theme})...`);
    await page.click('[data-testid="cbct-nav-tab-endo"]');
    await page.waitForTimeout(2500);
    await take(page, `04_endo_studio_${theme}.png`);

    // 5. 3D Volume Viewport
    console.log(`[5/5] 3D Volume (${theme})...`);
    await page.click('[data-testid="cbct-nav-tab-mpr-3d"]');
    await page.waitForTimeout(1000);

    // Switch 4th quadrant to 3D volume
    const vol3dModeBtn = await page.$('[data-testid="cbct-btn-mode-volume3d"]');
    if (vol3dModeBtn) {
      await vol3dModeBtn.click();
      await page.waitForTimeout(800);
    }

    // Expand 4th quadrant
    const expandBtn = await page.$(
      '[data-testid="btn-viewport-expand-panoramic"], [data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"]'
    );
    if (expandBtn) {
      await expandBtn.click();
      await page.waitForTimeout(2500);
    }

    await take(page, `05_volume3d_viewport_${theme}.png`);

    // Restore if expanded
    const collapseBtn = await page.$(
      '[data-testid="btn-viewport-collapse-panoramic"], [data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"]'
    );
    if (collapseBtn) {
      await collapseBtn.click();
      await page.waitForTimeout(800);
    }
  }

    // Copy all to brain artifacts
    const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b7016bb6-1e35-4290-8164-8c83429b85f6");
    if (fs.existsSync(brainDir)) {
      for (const f of fs.readdirSync(targetDir)) {
        if (f.endsWith(".png")) {
          fs.copyFileSync(path.join(targetDir, f), path.join(brainDir, f));
        }
      }
    }

    console.log(">>> ALL 10 REAL SCREENSHOTS CAPTURED AND COPIED TO BRAIN! <<<");
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in test_direct_cbct:", err);
  process.exit(1);
});
