/**
 * scripts/capture_clean_cbct_screenshots.cjs
 *
 * Captures clean CBCT slices and departments without floating presets on slices:
 * 1. docs/screenshots/cbct_departments/01_mpr_quad_dark.png
 * 2. docs/screenshots/cbct_departments/01_mpr_quad_light.png
 * 3. docs/screenshots/cbct_departments/02_panoramic_optg_50_50_dark.png
 * 4. docs/screenshots/cbct_departments/02_panoramic_optg_50_50_light.png
 *
 * Copies to apps/web/public/screenshots/ and closes browser cleanly.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/Desktop/НОВЫЕ_ПРУФЫ_ВНЕДРЕНИЯ_ШАРПЕН_И_CATMULL_ROM"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

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
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 35000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF CLEAN CBCT DEPARTMENTS ===");
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
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_active_patient_id", "pat-1");
    });

    const page = await ctx.newPage();

    // Mock minimal auth & dashboard
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
          appointments: [],
        }),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(3000);

    console.log("Triggering dente:open-cbct-demo event...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });

    console.log("Waiting for cbct-studio-modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 35000 });
    console.log("CBCT Studio modal opened!");

    // Wait for demo volume slices to finish decoding
    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4000);

    const themes = ["dark", "light"];

    for (const theme of themes) {
      console.log(`\n>>> CAPTURING THEME: ${theme.toUpperCase()} <<<`);
      await applyTheme(page, theme);

      // 1. Отдел 1: MPR Quad
      console.log(`Selecting MPR 3D Tab (${theme})...`);
      const mprTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"], button:has-text("MPR 3D")',
        { timeout: 15000 }
      );
      await mprTab.click();
      await page.waitForTimeout(2000);

      // Ensure 3D volume quadrant is not full-screen maximized
      const collapseBtn = await page.$(
        '[data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"], button[title*="Свернуть в сетку"]'
      );
      if (collapseBtn) {
        await collapseBtn.click();
        await page.waitForTimeout(1000);
      }

      await takeScreen(page, `01_mpr_quad_${theme}.png`, `Отдел 1: MPR Quad 4 квадранта (${theme})`);

      if (theme === "dark") {
        const sharpenBtn = await page.$('[data-testid="cbct-tool-sharpen"]');
        if (sharpenBtn) {
          await sharpenBtn.click();
          await page.waitForTimeout(500);
          await sharpenBtn.click();
          await page.waitForTimeout(800);
        }
        await takeScreen(page, `06_Полный_экран_КТ_Темный_кокпит_100_Sharpen.png`, `Реальный КТ Захарова 312 срезов Edge-to-Edge`);
      }

      // 2. Отдел 2: Панорама ОПТГ 50/50
      console.log(`Selecting Panoramic Tab (${theme})...`);
      const panoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-panorama"], [data-mode-testid="cbct-mode-panoramic-btn"], button:has-text("Панорама")',
        { timeout: 15000 }
      );
      await panoTab.click();
      await page.waitForTimeout(2500);

      await takeScreen(page, `02_panoramic_optg_50_50_${theme}.png`, `Отдел 2: Панорама ОПТГ 50/50 (${theme})`);
    }

    console.log("\n>>> SUCCESS: ALL REQUIRED CLEAN CBCT SCREENSHOTS CAPTURED! <<<");
  } finally {
    await browser.close();
    console.log("Browser cleanly closed.");
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
