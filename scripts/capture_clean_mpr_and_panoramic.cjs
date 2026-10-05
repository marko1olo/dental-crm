/**
 * scripts/capture_clean_mpr_and_panoramic.cjs
 *
 * Dedicated rock-solid capture for MPR Quad and Panoramic OPTG 50/50:
 * - 01_mpr_quad_dark.png
 * - 01_mpr_quad_light.png
 * - 02_panoramic_optg_50_50_dark.png
 * - 02_panoramic_optg_50_50_light.png
 *
 * Confirms complete elimination of floating quick W/L & colormap preset bars
 * over anatomical slices in CbctViewportsRuler.tsx.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/77830cc1-dac0-4da3-8789-c3f2b3c54e79");
const teammateBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2495ce44-c289-4cd8-8dca-cc6f7483a47d");

for (const d of [targetDir, publicDir, brainDir, teammateBrainDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
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

  const pTeammate = path.join(teammateBrainDir, name);
  fs.copyFileSync(p, pTeammate);
  console.log(`[COPIED teammate brain] ${pTeammate}`);
}

async function main() {
  console.log("=== STARTING CLEAN MPR QUAD & PANORAMIC CAPTURE ===");
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
    page.on("console", msg => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[PAGE ${msg.type()}]`, msg.text());
      }
    });
    page.on("pageerror", err => console.log(`[PAGE ERROR]`, err.message));

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
    console.log("Slices decoded! Waiting 6s for WebGL textures & slice canvas rendering...");
    await page.waitForTimeout(6000);

    const themes = ["dark", "light"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await page.evaluate((th) => {
        localStorage.setItem("dente_theme_mode", th);
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(th);
        }
        document.documentElement.setAttribute("data-theme", th);
        document.body.setAttribute("data-theme", th);
        const isDark = th === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      }, theme);
      await page.waitForTimeout(1500);

      // 1. Отдел 1: MPR Quad
      console.log(`[1/2] Capturing Department 1: MPR Quad (${theme})...`);
      const mprTab = await page.waitForSelector('[data-testid="cbct-nav-tab-mpr-3d"]', { timeout: 15000 });
      await mprTab.click();
      await page.waitForTimeout(2000);

      // Ensure 4th quadrant is collapsed into grid view if expanded
      const collapseBtn = await page.$(
        '[data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"], button[title*="Свернуть в сетку"]'
      );
      if (collapseBtn) {
        await collapseBtn.click();
        await page.waitForTimeout(1000);
      }

      await take(page, `01_mpr_quad_${theme}.png`);

      // 2. Отдел 2: Панорама ОПТГ 50/50
      console.log(`[2/2] Capturing Department 2: Panoramic ОПТГ 50/50 (${theme})...`);
      const panoTab = await page.waitForSelector('[data-testid="cbct-nav-tab-panorama"]', { timeout: 15000 });
      await panoTab.click();
      await page.waitForTimeout(3000);

      await take(page, `02_panoramic_optg_50_50_${theme}.png`);
    }

    console.log("\n>>> SUCCESS: ALL MPR QUAD AND PANORAMA SCREENSHOTS CAPTURED! <<<");
  } catch (err) {
    console.error("FATAL ERROR in capture_clean_mpr_and_panoramic:", err);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error("OUTER FATAL:", err);
  process.exit(1);
});
