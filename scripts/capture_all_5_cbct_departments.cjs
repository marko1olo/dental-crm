/**
 * scripts/capture_all_5_cbct_departments.cjs
 *
 * Captures all 5 working departments of 3D CBCT Studio Picasso (CbctMprImplantStudioModal):
 * 1. Отдел 1: MPR Quad (Мультипланарная реконструкция) — 4 квадранта (Аксиал, Коронал, Сагиттал + 3D Объем)
 * 2. Отдел 2: Панорама ОПТГ 50/50 (PanoramicWorkspace) — доминантный срез ОПТГ сверху + Аксиал с дугой и кросс-секции снизу
 * 3. Отдел 3: Имплантологическая студия (ImplantWorkspace) — срез гребня, канал нижнечелюстного нерва, виртуальный имплантат
 * 4. Отдел 4: Эндодонтическая студия (EndoWorkspace) — прицельный срез каналов корня с контурной резкостью (Unsharp Masking)
 * 5. Отдел 5: 3D Volume Viewport (CbctVolume3DViewport) — полноэкранная 3D визуализация объема черепа/челюсти
 *
 * Viewport: Desktop 1440x900
 * Themes: Light first, then Dark (10 screenshots total)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/77830cc1-dac0-4da3-8789-c3f2b3c54e79"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
    localStorage.setItem("dente_tour_completed", "true");
  });

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(1000);
  console.log(`[THEME] Applied ${theme} successfully.`);
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
  console.log("=== STARTING AUTONOMOUS CAPTURE OF ALL 5 CBCT DEPARTMENTS ===");
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
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log("Navigating directly to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for CBCT Studio modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 25000 });
    console.log("CBCT Studio modal mounted successfully!");

    // Wait for demo volume slices to finish decoding
    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Loader detached or already completed.");
    });

    // Wait for canvas rasterization & WebGL texture initialization
    console.log("Waiting 5 seconds for canvas rasterization & WebGL texture upload...");
    await page.waitForTimeout(5000);

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await applyTheme(page, theme);

      // -----------------------------------------------------------------------
      // 1. ОТДЕЛ 1: MPR QUAD (МУЛЬТИПЛАНАРНАЯ РЕКОНСТРУКЦИЯ)
      // -----------------------------------------------------------------------
      console.log(`\n[1/5] Capturing Department 1: MPR Quad (${theme})...`);
      const mprTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"]',
        { timeout: 10000 }
      );
      await mprTab.click();
      await page.waitForTimeout(800);

      // Collapse 3d volume if maximized
      const collapse3d = await page.$(
        '[data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"], button[title*="Свернуть"]'
      );
      if (collapse3d) {
        await collapse3d.click();
        await page.waitForTimeout(800);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1500);

      await takeScreen(
        page,
        `01_mpr_quad_${theme}.png`,
        `Отдел 1: MPR Quad 4 квадранта (Аксиал, Коронал, Сагиттал, 3D Объем) — ${theme}`
      );

      // -----------------------------------------------------------------------
      // 2. ОТДЕЛ 2: ПАНОРАМА ОПТГ 50/50 (PANORAMIC WORKSPACE)
      // -----------------------------------------------------------------------
      console.log(`\n[2/5] Capturing Department 2: Panoramic ОПТГ 50/50 (${theme})...`);
      const panoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-panorama"], [data-mode-testid="cbct-mode-panoramic-btn"]',
        { timeout: 10000 }
      );
      await panoTab.click();
      await page.waitForSelector(
        '[data-testid="cbct-workspace-panoramic-root"], [data-testid="cbct-panoramic-dominant-container"], [data-testid="cbct-panorama-canvas"]',
        { timeout: 20000 }
      );
      await page.waitForTimeout(2000);

      await takeScreen(
        page,
        `02_panoramic_optg_50_50_${theme}.png`,
        `Отдел 2: Панорама ОПТГ 50/50 (Доминантный срез ОПТГ + Аксиал с дугой и кросс-секции) — ${theme}`
      );

      // 2b. Click tooth 46 in FDI ribbon
      const tooth46Btn = await page.$('[data-testid="cbct-fdi-tooth-46"]');
      if (tooth46Btn) {
        console.log(`Clicking FDI tooth 46 (${theme})...`);
        await tooth46Btn.click();
        await page.waitForTimeout(1500);
        await takeScreen(
          page,
          `02b_panoramic_fdi_tooth_46_${theme}.png`,
          `Навигация по зубу #46 через FDI Ribbon — ${theme}`
        );
      }

      // 2c. Switch to Maxilla and click tooth 16
      const maxillaTab = await page.$('[data-testid="cbct-fdi-tab-maxilla"]');
      if (maxillaTab) {
        console.log(`Switching to Maxilla and clicking tooth 16 (${theme})...`);
        await maxillaTab.click();
        await page.waitForTimeout(1000);
        const tooth16Btn = await page.$('[data-testid="cbct-fdi-tooth-16"]');
        if (tooth16Btn) {
          await tooth16Btn.click();
          await page.waitForTimeout(1500);
          await takeScreen(
            page,
            `02c_panoramic_fdi_tooth_16_maxilla_${theme}.png`,
            `Переключение челюсти на ВЧ и навигация по зубу #16 — ${theme}`
          );
        }
      }

      // -----------------------------------------------------------------------
      // 3. ОТДЕЛ 3: ИМПЛАНТОЛОГИЧЕСКАЯ СТУДИЯ (IMPLANT WORKSPACE)
      // -----------------------------------------------------------------------
      console.log(`\n[3/5] Capturing Department 3: Implant Studio (${theme})...`);
      const implantTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-implant"], [data-mode-testid="cbct-mode-implant-btn"]',
        { timeout: 10000 }
      );
      await implantTab.click();
      await page.waitForSelector(
        '[data-testid="cbct-workspace-implant-root"], [data-testid="cbct-viewport-container-cross-section"]',
        { timeout: 20000 }
      );
      await page.waitForTimeout(2000);

      await takeScreen(
        page,
        `03_implant_studio_${theme}.png`,
        `Отдел 3: Имплантологическая студия (Срез гребня, трассировка нерва, виртуальный имплантат) — ${theme}`
      );

      // -----------------------------------------------------------------------
      // 4. ОТДЕЛ 4: ЭНДОДОНТИЧЕСКАЯ СТУДИЯ (ENDO WORKSPACE)
      // -----------------------------------------------------------------------
      console.log(`\n[4/5] Capturing Department 4: Endo Studio (${theme})...`);
      const endoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"]',
        { timeout: 10000 }
      );
      await endoTab.click();
      await page.waitForSelector(
        '[data-testid="cbct-workspace-endo-root"]',
        { timeout: 20000 }
      );
      await page.waitForTimeout(2000);

      await takeScreen(
        page,
        `04_endo_studio_${theme}.png`,
        `Отдел 4: Эндодонтическая студия (Прицельные высокодетализированные срезы каналов с резкостью) — ${theme}`
      );

      // -----------------------------------------------------------------------
      // 5. ОТДЕЛ 5: 3D VOLUME VIEWPORT (FULLSCREEN)
      // -----------------------------------------------------------------------
      console.log(`\n[5/5] Capturing Department 5: 3D Volume Viewport Fullscreen (${theme})...`);
      // Return to MPR Quad first
      const mprTab2 = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"]',
        { timeout: 10000 }
      );
      await mprTab2.click();
      await page.waitForTimeout(800);

      // Maximize the 3D volume quadrant
      const expand3dBtn = await page.waitForSelector(
        '[data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"], button[title*="Развернуть 3D объем"]',
        { timeout: 10000 }
      );
      await expand3dBtn.click();
      await page.waitForSelector(
        '[data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"]',
        { timeout: 10000 }
      );
      await page.waitForTimeout(2000);

      await takeScreen(
        page,
        `05_volume3d_viewport_${theme}.png`,
        `Отдел 5: 3D Volume Viewport Полноэкранный (3D визуализация объема черепа/челюсти) — ${theme}`
      );

      // Restore 3D volume quadrant
      const collapseBtn = await page.$(
        '[data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"], button[title*="Свернуть в сетку"]'
      );
      if (collapseBtn) {
        await collapseBtn.click();
        await page.waitForTimeout(800);
      }
    }

    console.log("\n>>> SUCCESS: ALL 10 SCREENSHOTS OF ALL 5 CBCT DEPARTMENTS CAPTURED! <<<");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
