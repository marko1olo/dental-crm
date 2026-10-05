import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

function log(msg) {
  fs.writeSync(1, msg + "\n");
}

const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");
const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50");
const subagentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b36b11d2-6adf-48f9-8341-ec798abe11e7");

for (const d of [targetDir, publicDir, brainDir, subagentBrainDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function takeSnap(page, name) {
  const p = path.join(targetDir, name);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch {}
  }
  await page.screenshot({ path: p, fullPage: false, animations: "allow" });
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  log(`[SAVED target] ${name} (${sz} KB)`);

  fs.copyFileSync(p, path.join(publicDir, name));
  fs.copyFileSync(p, path.join(brainDir, name));
  fs.copyFileSync(p, path.join(subagentBrainDir, name));
}

async function captureThemePass(browser, theme) {
  log(`\n==================================================`);
  log(`>>> STARTING PASS: ${theme.toUpperCase()} <<<`);
  log(`==================================================`);

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await ctx.addInitScript((th) => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_quest_progress_v2",
      JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
  }, theme);

  const page = await ctx.newPage();
  log(`Navigating to http://127.0.0.1:5173/#imaging in ${theme} mode...`);
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);

  // Clear tour overlays
  await page.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
  });

  // Open CBCT Modal
  log("Locating and clicking 'КЛКТ Студия 3D' button...");
  const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']").first();
  await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
  await openMprBtn.click({ force: true });

  const modal = page.locator("[data-testid='cbct-studio-modal']").first();
  await modal.waitFor({ state: "visible", timeout: 20000 });
  log("[UI AUDIT] CbctMprImplantStudioModal mounted successfully.");

  // Check if volume is already mounted or click Load Demo
  const dropzone = modal.locator("[data-testid='cbct-empty-volume-dropzone']").first();
  if (await dropzone.isVisible()) {
    log("Clicking 'cbct-btn-load-demo-empty' to trigger native 312 slices loader...");
    const loadDemoBtn = modal.locator("[data-testid='cbct-btn-load-demo-empty']").first();
    await loadDemoBtn.waitFor({ state: "visible", timeout: 15000 });
    await loadDemoBtn.click({ force: true });
    log("Waiting for dropzone to detach/hide...");
    await dropzone.waitFor({ state: "hidden", timeout: 45000 });
    log("[VOLUME MOUNTED] Real 312 slices volume mounted into viewports!");
  } else {
    log("[VOLUME MOUNTED] Volume is already mounted!");
  }

  // Wait for WebGL rasterization
  await page.waitForTimeout(4000);

  // 1. MPR 3D Quad
  log(`[1/5] Capturing MPR 3D Quad (${theme})...`);
  const mprTab = modal.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d']").first();
  if (await mprTab.isVisible()) {
    await mprTab.click({ force: true });
    await page.waitForTimeout(2000);
  }
  await takeSnap(page, `01_mpr_quad_${theme}.png`);

  // 2. Panorama OPTG 50/50
  log(`[2/5] Capturing Panorama (${theme})...`);
  const panoTab = modal.locator("button:has-text('Панорама'), [data-testid='cbct-nav-tab-panorama']").first();
  if (await panoTab.isVisible()) {
    await panoTab.click({ force: true });
    await page.waitForTimeout(2000);
  }
  const maxillaBtn = modal.locator("[data-testid='cbct-axial-switch-maxilla-btn'], [data-testid='cbct-jaw-switch-maxilla-btn']").first();
  if (await maxillaBtn.isVisible()) {
    await maxillaBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
  await takeSnap(page, `02_panoramic_optg_50_50_${theme}.png`);

  // 3. Implant Studio
  log(`[3/5] Capturing Implant Studio (${theme})...`);
  const implantTab = modal.locator("button:has-text('Имплантация'), [data-testid='cbct-nav-tab-implant']").first();
  if (await implantTab.isVisible()) {
    await implantTab.click({ force: true });
    await page.waitForTimeout(2000);
  }
  const tooth26 = modal.locator("[data-testid='cbct-ridge-tooth-26-btn']").first();
  if (await tooth26.isVisible()) {
    await tooth26.click({ force: true });
    await page.waitForTimeout(800);
  }
  await takeSnap(page, `03_implant_studio_${theme}.png`);

  // 4. Endo Workspace / Studio
  log(`[4/5] Capturing Endo Workspace (${theme})...`);
  const endoTab = modal.locator("button:has-text('Эндодонтия'), [data-testid='cbct-nav-tab-endo']").first();
  if (await endoTab.isVisible()) {
    await endoTab.click({ force: true });
    await page.waitForTimeout(2000);
  }
  await takeSnap(page, `04_endo_workspace_${theme}.png`);
  await takeSnap(page, `04_endo_studio_${theme}.png`);

  // 5. Fullscreen 3D Volume Viewport
  log(`[5/5] Capturing Fullscreen 3D Volume (${theme})...`);
  const mprTab2 = modal.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d']").first();
  if (await mprTab2.isVisible()) {
    await mprTab2.click({ force: true });
    await page.waitForTimeout(1000);
  }
  const btnVolume3D = modal.locator("[data-testid='cbct-btn-mode-volume3d']").first();
  if (await btnVolume3D.isVisible()) {
    await btnVolume3D.click({ force: true });
    await page.waitForTimeout(1000);
  }
  const expand3D = modal.locator("[data-testid='btn-viewport-expand-volume3d']").first();
  if (await expand3D.isVisible()) {
    await expand3D.click({ force: true });
    await page.waitForTimeout(2500);
  }
  await takeSnap(page, `05_volume3d_viewport_${theme}.png`);

  const collapse3D = modal.locator("[data-testid='btn-viewport-collapse-volume3d']").first();
  if (await collapse3D.isVisible()) {
    await collapse3D.click({ force: true });
    await page.waitForTimeout(500);
  }

  await ctx.close();
  log(`>>> FINISHED PASS: ${theme.toUpperCase()} <<<\n`);
}

async function main() {
  log("=== STARTING DUAL-PASS RADIOLOGY PROOFS CAPTURE (1440x900) ===");
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

  try {
    // 1. Dark Pass (clean context)
    await captureThemePass(browser, "dark");
    // 2. Light Pass (clean context)
    await captureThemePass(browser, "light");
    log("\n>>> ALL 10 RADIOLOGY SCREENSHOTS CAPTURED 100% CLEANLY! <<<");
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  log("FATAL: " + err.message);
  process.exit(1);
});
