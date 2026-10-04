/**
 * scripts/capture_light_cbct.cjs
 * Captures all 5 CBCT departments in LIGHT theme.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b7016bb6-1e35-4290-8164-8c83429b85f6"),
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
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 30000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF 5 CBCT DEPARTMENTS (LIGHT THEME) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
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

    console.log("Navigating directly to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for CBCT Studio modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 25000 });
    console.log("CBCT Studio modal mounted successfully!");

    // Wait for demo volume slices to decode
    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Loader detached or already completed.");
    });

    // Wait 5 seconds for WebGL and 2D canvas rasterization
    console.log("Waiting 5 seconds for canvas rasterization...");
    await page.waitForTimeout(5000);

    // -----------------------------------------------------------------------
    // 1. ОТДЕЛ 1: MPR QUAD (МУЛЬТИПЛАНАРНАЯ РЕКОНСТРУКЦИЯ)
    // -----------------------------------------------------------------------
    console.log("\n[1/5] Capturing Department 1: MPR Quad (light)...");
    const mprTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"]',
      { timeout: 10000 }
    );
    await mprTab.click();
    await page.waitForTimeout(1500);

    await takeScreen(
      page,
      "01_mpr_quad_light.png",
      "Отдел 1: MPR Quad 4 квадранта (Аксиал, Коронал, Сагиттал, 3D Объем) — light"
    );

    // -----------------------------------------------------------------------
    // 2. ОТДЕЛ 2: ПАНОРАМА ОПТГ 50/50 (PANORAMIC WORKSPACE)
    // -----------------------------------------------------------------------
    console.log("\n[2/5] Capturing Department 2: Panoramic ОПТГ 50/50 (light)...");
    const panoTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-panorama"], [data-mode-testid="cbct-mode-panoramic-btn"]',
      { timeout: 10000 }
    );
    await panoTab.click();
    await page.waitForTimeout(2500);

    await takeScreen(
      page,
      "02_panoramic_optg_50_50_light.png",
      "Отдел 2: Панорама ОПТГ 50/50 (Доминантный срез ОПТГ + Аксиал с дугой и кросс-секции) — light"
    );

    // -----------------------------------------------------------------------
    // 3. ОТДЕЛ 3: ИМПЛАНТОЛОГИЧЕСКАЯ СТУДИЯ (IMPLANT WORKSPACE)
    // -----------------------------------------------------------------------
    console.log("\n[3/5] Capturing Department 3: Implant Studio (light)...");
    const implantTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-implant"], [data-mode-testid="cbct-mode-implant-btn"]',
      { timeout: 10000 }
    );
    await implantTab.click();
    await page.waitForTimeout(2500);

    await takeScreen(
      page,
      "03_implant_studio_light.png",
      "Отдел 3: Имплантологическая студия (Срез гребня, трассировка нерва, виртуальный имплантат) — light"
    );

    // -----------------------------------------------------------------------
    // 4. ОТДЕЛ 4: ЭНДОДОНТИЧЕСКАЯ СТУДИЯ (ENDO WORKSPACE)
    // -----------------------------------------------------------------------
    console.log("\n[4/5] Capturing Department 4: Endo Studio (light)...");
    const endoTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"]',
      { timeout: 10000 }
    );
    await endoTab.click();
    await page.waitForTimeout(2500);

    await takeScreen(
      page,
      "04_endo_studio_light.png",
      "Отдел 4: Эндодонтическая студия (Прицельные высокодетализированные срезы каналов с резкостью) — light"
    );

    // -----------------------------------------------------------------------
    // 5. ОТДЕЛ 5: 3D VOLUME VIEWPORT (FULLSCREEN)
    // -----------------------------------------------------------------------
    console.log("\n[5/5] Capturing Department 5: 3D Volume Viewport Fullscreen (light)...");
    const mprTab2 = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"]',
      { timeout: 10000 }
    );
    await mprTab2.click();
    await page.waitForTimeout(1000);

    const expand3dBtn = await page.waitForSelector(
      '[data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"], button[title*="Развернуть 3D объем"]',
      { timeout: 10000 }
    );
    await expand3dBtn.click();
    await page.waitForTimeout(2500);

    await takeScreen(
      page,
      "05_volume3d_viewport_light.png",
      "Отдел 5: 3D Volume Viewport Полноэкранный (3D визуализация объема черепа/челюсти) — light"
    );

    console.log("\n>>> SUCCESS: ALL 5 LIGHT CBCT SCREENSHOTS CAPTURED! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
