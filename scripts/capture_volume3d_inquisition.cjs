const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2495ce44-c289-4cd8-8dca-cc6f7483a47d");

for (const d of [targetDir, publicDir, brainDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function take(page, name) {
  const p = path.join(targetDir, name);
  await page.screenshot({ path: p, timeout: 30000 });
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED target] ${name} (${sz} KB)`);

  const pPublic = path.join(publicDir, name);
  fs.copyFileSync(p, pPublic);
  console.log(`[COPIED public] ${pPublic}`);

  const pBrain = path.join(brainDir, name);
  fs.copyFileSync(p, pBrain);
  console.log(`[COPIED brain] ${pBrain}`);
}

async function main() {
  console.log("Launching Chromium for CBCT 3D Volume capture...");
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

    page.on("console", msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
    page.on("pageerror", err => console.error("[BROWSER ERROR]", err.message));

    await page.route("**/api/**", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 });
    console.log("Modal opened!");

    const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 10000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
    }

    console.log("Waiting for slices to decode...");
    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 30000 }).catch(() => {});
    console.log("Slices decoded! Waiting 5s for WebGL texture prep...");
    await page.waitForTimeout(5000);

    // Switch to MPR 3D
    await page.click('[data-testid="cbct-nav-tab-mpr-3d"]').catch(() => {});
    await page.waitForTimeout(1000);

    // Switch 4th quadrant to 3D volume
    const vol3dModeBtn = await page.$('[data-testid="cbct-btn-mode-volume3d"]');
    if (vol3dModeBtn) {
      console.log("Clicking 3D volume quadrant mode button...");
      await vol3dModeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Expand 4th quadrant
    const expandBtn = await page.$(
      '[data-testid="btn-viewport-expand-panoramic"], [data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"]'
    );
    if (expandBtn) {
      console.log("Expanding 3D volume quadrant...");
      await expandBtn.click();
      await page.waitForTimeout(3000);
    }

    const themes = ["dark", "light"];
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
      await page.waitForTimeout(1500);

      // Verify MAR button and HUD badge exist in DOM
      const marToggle = await page.$('[data-testid="cbct-volume-3d-mar-toggle"]');
      const marBadge = await page.$('[data-testid="cbct-hud-mar-status"]');
      console.log(`Theme ${theme}: MAR toggle in DOM: ${!!marToggle}, MAR HUD badge in DOM: ${!!marBadge}`);

      await take(page, `05_volume3d_viewport_${theme}.png`);
    }

    console.log("\n>>> SUCCESS: Captured 05_volume3d_viewport_dark.png and 05_volume3d_viewport_light.png <<<");
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_volume3d_inquisition:", err);
  process.exit(1);
});
