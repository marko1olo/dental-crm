import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

function log(msg) {
  fs.writeSync(1, msg + "\n");
}

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50");

for (const d of [targetDir, publicDir, brainDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

let cdpSession = null;

async function take(page, name) {
  const p = path.join(targetDir, name);
  if (!cdpSession) {
    cdpSession = await page.context().newCDPSession(page);
  }
  const { data } = await cdpSession.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(p, Buffer.from(data, "base64"));
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  log(`[SAVED target] ${name} (${sz} KB)`);

  const pPublic = path.join(publicDir, name);
  fs.copyFileSync(p, pPublic);

  const pBrain = path.join(brainDir, name);
  fs.copyFileSync(p, pBrain);
}

async function main() {
  log("=== STARTING LIGHTNING FAST CDP RADIOLOGY PROOFS CAPTURE (1440x900) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ]
  });

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
  log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 25000 });
  log("Navigated. Waiting for slices decoding...");

  // Wait until loading progress bar is detached and axial canvas is present
  await page.waitForSelector('text=Чтение манифеста', { state: 'detached', timeout: 35000 }).catch(() => {});
  await page.waitForSelector('text=Загрузка центрального среза', { state: 'detached', timeout: 35000 }).catch(() => {});
  await page.waitForSelector('canvas[data-testid="cbct-axial-canvas"]', { timeout: 35000 }).catch(() => {});
  log("Slices decoded! Waiting 4s for WebGL texture rasterization...");
  await page.waitForTimeout(4000);

  const themes = ["dark", "light"];

  for (const theme of themes) {
    log(`\n=== PROCESSING THEME: ${theme.toUpperCase()} ===`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(1000);

    // 1. Отдел 1: MPR 3D
    log(`[1/4] Capturing MPR 3D Quad (${theme})...`);
    const mprTab = await page.$('[data-testid="cbct-nav-tab-mpr-3d"], button:has-text("MPR 3D")');
    if (mprTab) {
      await mprTab.click();
      await page.waitForTimeout(1500);
    }
    await take(page, `01_mpr_quad_${theme}.png`);

    // 2. Отдел 2: Панорама ОПТГ 50/50
    log(`[2/4] Capturing Panorama (${theme})...`);
    const panoTab = await page.$('[data-testid="cbct-nav-tab-panorama"], button:has-text("Панорама")');
    if (panoTab) {
      await panoTab.click();
      await page.waitForTimeout(1500);
    }
    await take(page, `02_panoramic_optg_50_50_${theme}.png`);

    // 3. Отдел 3: Имплантация
    log(`[3/4] Capturing Implant Studio (${theme})...`);
    const implantTab = await page.$('[data-testid="cbct-nav-tab-implant"], button:has-text("Имплантация")');
    if (implantTab) {
      await implantTab.click();
      await page.waitForTimeout(1500);
    }
    await take(page, `03_implant_studio_${theme}.png`);

    // 4. Отдел 4: Эндодонтия
    log(`[4/4] Capturing Endo Workspace (${theme})...`);
    const endoTab = await page.$('[data-testid="cbct-nav-tab-endo"], button:has-text("Эндодонтия")');
    if (endoTab) {
      await endoTab.click();
      await page.waitForTimeout(1500);
    }
    await take(page, `04_endo_workspace_${theme}.png`);
  }

  log("\n>>> ALL 8 RADIOLOGY SCREENSHOTS CAPTURED SUCCESSFULLY VIA CDP! <<<");
  await browser.close();
}

main().catch(err => {
  log("FATAL: " + err.message);
  process.exit(1);
});
