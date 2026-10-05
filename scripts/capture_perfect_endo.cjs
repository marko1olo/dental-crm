const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, timeout: 25000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING PERFECT ENDO COMPASS 3D CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const page = await ctx.newPage();

    await page.route("**/api/**", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 35000 });

    console.log("Waiting for CBCT Studio modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 30000 });
    console.log("CBCT Studio modal mounted!");

    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Loader already detached.");
    });

    console.log("Waiting 4 seconds for canvas rasterization...");
    await page.waitForTimeout(4000);

    // Switch to Endo tab
    console.log("Switching to Endo tab...");
    const endoTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"], button:has-text("Эндо")',
      { timeout: 15000 }
    );
    await endoTab.click();
    await page.waitForTimeout(2000);

    // Ensure Compass Panel is visible
    console.log("Verifying Endo Compass Panel...");
    await page.waitForSelector('[data-testid="endo-compass-panel"], [data-testid="cbct-endo-floating-compass"]', { timeout: 10000 });

    // 1. Dark Theme, Tooth 36 (default)
    console.log("\n[1/4] Capturing 01_endo_compass_workspace_dark.png...");
    await takeScreen(page, "01_endo_compass_workspace_dark.png", "Endo Compass 3D Studio (Dark, Tooth 36)");

    // 2. Dark Theme, Tooth 16 (with MB2)
    console.log("\n[2/4] Switching to Tooth 16...");
    const tooth16Btn = await page.waitForSelector(
      '[data-testid="cbct-endo-tooth-btn-16"], button:has-text("16")',
      { timeout: 10000 }
    );
    await tooth16Btn.click();
    await page.waitForTimeout(1500);
    await takeScreen(page, "02_endo_compass_tooth_16_mb2_dark.png", "Endo Compass 3D Studio (Dark, Tooth 16 MB2)");

    // 3. Switch to Light Theme
    console.log("\nSwitching to Light theme...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.className = "light";
      document.body.className = "light";
      document.documentElement.style.colorScheme = "light";
    });
    await page.waitForTimeout(1000);

    // 3. Light Theme, Tooth 16
    console.log("\n[3/4] Capturing 03_endo_compass_tooth_16_mb2_light.png...");
    await takeScreen(page, "03_endo_compass_tooth_16_mb2_light.png", "Endo Compass 3D Studio (Light, Tooth 16 MB2)");

    // 4. Light Theme, Tooth 36
    console.log("\n[4/4] Switching back to Tooth 36 in Light theme...");
    const tooth36Btn = await page.waitForSelector(
      '[data-testid="cbct-endo-tooth-btn-36"], button:has-text("36")',
      { timeout: 10000 }
    );
    await tooth36Btn.click();
    await page.waitForTimeout(1500);
    await takeScreen(page, "04_endo_compass_workspace_light.png", "Endo Compass 3D Studio (Light, Tooth 36)");

    console.log("\n=== ALL 4 PERFECT SCREENSHOTS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
