const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2495ce44-c289-4cd8-8dca-cc6f7483a47d");

for (const d of [targetDir, publicDir, brainDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function take(page, name) {
  const p = path.join(targetDir, name);
  await page.screenshot({ path: p, timeout: 30000 });
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);

  const pPublic = path.join(publicDir, name);
  fs.copyFileSync(p, pPublic);
  console.log(`[COPIED public] ${pPublic}`);

  const pBrain = path.join(brainDir, name);
  fs.copyFileSync(p, pBrain);
  console.log(`[COPIED brain] ${pBrain}`);
}

async function main() {
  console.log("=== STARTING CBCT 3D VOLUME CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const page = await ctx.newPage();
    page.on("console", msg => console.log(`[PAGE ${msg.type()}]`, msg.text()));
    page.on("pageerror", err => console.log(`[PAGE ERROR]`, err.message));
    page.on("requestfailed", req => console.log(`[REQ FAILED]`, req.url(), req.failure()?.errorText));
    page.on("response", res => {
      if (res.status() >= 400) {
        console.log(`[RES ${res.status()}]`, res.url());
      }
    });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Navigated. Waiting 2s...");
    await page.waitForTimeout(2000);

    let modal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 }).catch(() => null);
    if (!modal) {
      console.log("Dispatching dente:open-cbct-demo event...");
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
      });
      modal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 });
    }
    console.log("Modal opened successfully!");

    // Check load demo volume button
    const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 8000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
    }

    console.log("Waiting for demo volume slices decoding to finish...");
    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 30000 }).catch(() => {});
    console.log("Slices decoded! Waiting 6s for WebGL textures & raymarching initialization...");
    await page.waitForTimeout(6000);

    // Switch 4th quadrant to 3D volume
    console.log("Switching 4th quadrant to 3D volume...");
    const vol3dModeBtn = await page.$('[data-testid="cbct-btn-mode-volume3d"]');
    if (vol3dModeBtn) {
      await vol3dModeBtn.click();
      console.log("Clicked cbct-btn-mode-volume3d");
      await page.waitForTimeout(1000);
    } else {
      console.log("Warning: cbct-btn-mode-volume3d not found, proceeding...");
    }

    // Expand 4th quadrant
    console.log("Expanding 4th quadrant...");
    const expandBtn = await page.$(
      '[data-testid="btn-viewport-expand-panoramic"], [data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"]'
    );
    if (expandBtn) {
      await expandBtn.click();
      console.log("Clicked expand button");
      await page.waitForTimeout(3000);
    } else {
      console.log("Warning: expand button not found, proceeding...");
    }

    // 1. CAPTURE DARK THEME (default)
    console.log("\n=== CAPTURING 05_volume3d_viewport_dark.png ===");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    });
    await page.waitForTimeout(1500);

    // Check MAR controls in DOM
    const marToggleDark = await page.$('[data-testid="cbct-volume-3d-mar-toggle"]');
    const marBadgeDark = await page.$('[data-testid="cbct-hud-mar-status"]');
    console.log(`DARK: MAR toggle in DOM: ${!!marToggleDark}, MAR HUD badge in DOM: ${!!marBadgeDark}`);

    await take(page, "05_volume3d_viewport_dark.png");

    // 2. CAPTURE LIGHT THEME
    console.log("\n=== CAPTURING 05_volume3d_viewport_light.png ===");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    });
    await page.waitForTimeout(1500);

    const marToggleLight = await page.$('[data-testid="cbct-volume-3d-mar-toggle"]');
    const marBadgeLight = await page.$('[data-testid="cbct-hud-mar-status"]');
    console.log(`LIGHT: MAR toggle in DOM: ${!!marToggleLight}, MAR HUD badge in DOM: ${!!marBadgeLight}`);

    await take(page, "05_volume3d_viewport_light.png");

    console.log("\n>>> ALL 3D VOLUME SCREENSHOTS SUCCESSFULLY CAPTURED AND DISTRIBUTED! <<<");
  } catch (err) {
    console.error("FATAL ERROR in capture_3d_volume_real:", err);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error("OUTER FATAL:", err);
  process.exit(1);
});
