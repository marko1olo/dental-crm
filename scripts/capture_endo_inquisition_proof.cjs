/**
 * scripts/capture_endo_inquisition_proof.cjs
 *
 * Red Team Inquisitor-Automator #4: Complete Endodontic PACS & 043/u Integration Proof.
 * Captures 1440x900 pixel-inspected screenshots for both PC Dark and PC Light.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const screenshotDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/endo_protocol_inquisition");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme.toUpperCase()}...`);
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

async function captureScreen(page, fileName, description) {
  const filePath = path.join(screenshotDir, fileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", timeout: 35000 });
  const stat = fs.statSync(filePath);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING COMPLETE RED TEAM ENDO PROOF CAPTURE ===");
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
      localStorage.setItem("dente_active_patient_id", "demo-pat-zakharov");
    });

    const page = await ctx.newPage();

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENE 1: 3D Frangi & Fast Marching Voxel Engine (Dark & Light)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[SCENE 1] Loading Endo Experimental Harness...");
    await page.goto("http://127.0.0.1:5173/endo_visit_preview.html?view=harness", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    const calcBtn = await page.waitForSelector('[data-testid="endo-trigger-calc-btn"]', { timeout: 15000 });
    console.log("Triggering 3D Frangi Voxel Calculation...");
    await calcBtn.click();
    await page.waitForSelector("text=Завершено", { timeout: 35000 });
    console.log("3D computation finished!");
    await page.waitForTimeout(1000);

    // Click exports in harness to simulate user action and populate localStorage
    const harnessEmrBtn = await page.waitForSelector('[data-testid="endo-harness-export-emr-btn"]', { timeout: 5000 });
    await harnessEmrBtn.click();
    await page.waitForTimeout(500);

    const harnessPlanBtn = await page.waitForSelector('[data-testid="endo-harness-export-plan-btn"]', { timeout: 5000 });
    await harnessPlanBtn.click();
    await page.waitForTimeout(800);

    await applyTheme(page, "dark");
    await captureScreen(page, "01_endo_harness_3d_worker_dark.png", "3D Frangi Voxel Tracing & Telemetry (Dark)");

    await applyTheme(page, "light");
    await captureScreen(page, "01_endo_harness_3d_worker_light.png", "3D Frangi Voxel Tracing & Telemetry (Light)");

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENE 2: CBCT Endo Workspace with 3D Compass & 804n Plan CTA
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[SCENE 2] Opening CBCT Studio via endo_visit_preview.html?view=cbct...");
    await page.goto("http://127.0.0.1:5173/endo_visit_preview.html?view=cbct", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2500);

    console.log("Toggling 3D Endo Compass Floating Panel...");
    const compassToggleBtn = await page.waitForSelector('[data-testid="cbct-endo-compass-toggle-btn"]', { timeout: 15000 });
    await compassToggleBtn.click();
    await page.waitForTimeout(1500);

    // Click start or rerun analysis if available
    const startOrRerunBtn = await page.waitForSelector(
      '[data-testid="endo-compass-start-analysis-btn"], [data-testid="endo-compass-rerun-btn"]',
      { timeout: 10000 }
    );
    console.log("Triggering analysis in Endo Compass...");
    await startOrRerunBtn.click();
    console.log("Waiting for Endo Compass calculation to finish...");
    await page.waitForSelector('[data-testid="endo-compass-panel"]', { timeout: 45000 });
    await page.waitForTimeout(1500);

    // Export to Plan and EMR from Compass
    const planExportBtn = await page.$('[data-testid="endo-compass-export-plan-btn"]');
    if (planExportBtn) {
      await planExportBtn.click();
      await page.waitForTimeout(500);
    }
    const emrExportBtn = await page.$('[data-testid="endo-compass-export-emr-btn"]');
    if (emrExportBtn) {
      await emrExportBtn.click();
      await page.waitForTimeout(500);
    }

    await applyTheme(page, "dark");
    await captureScreen(page, "02_endo_cbct_mpr_compass_dark.png", "CBCT Endo Workspace with 3D Compass & 804n Plan CTA (Dark)");

    await applyTheme(page, "light");
    await captureScreen(page, "02_endo_cbct_mpr_compass_light.png", "CBCT Endo Workspace with 3D Compass & 804n Plan CTA (Light)");

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENE 3: EMK Outpatient Card Form 043/u with 3D CBCT Auto-Fill Banner
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[SCENE 3] Loading Integrated Form 043/u Visit Diary Preview...");
    await page.goto("http://127.0.0.1:5173/endo_visit_preview.html?view=visit", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    // Expand details
    const endoSummary = await page.$("summary");
    if (endoSummary) {
      await endoSummary.click();
      await page.waitForTimeout(1000);
    }

    // Check if 3D CBCT Banner button is present and click it
    const load3dWlBtn = await page.$('[data-testid="emk-apply-cbct-channel-btn"]');
    if (load3dWlBtn) {
      console.log("Clicking 'Загрузить 3D WL' from CBCT Banner...");
      await load3dWlBtn.click();
      await page.waitForTimeout(800);
    }

    // Click "+ Внести эндо-протокол в дневник"
    const applyToPlanBtn = await page.$('[data-testid="btn-apply-endo-to-plan"]');
    if (applyToPlanBtn) {
      console.log("Applying endo protocol to 043/u plan note...");
      await applyToPlanBtn.click();
      await page.waitForTimeout(800);
    }

    await applyTheme(page, "dark");
    await captureScreen(page, "03_endo_visit_043_protocol_dark.png", "EMK Form 043/u with CBCT 3D Sync & SOAP Note (Dark)");

    await applyTheme(page, "light");
    await captureScreen(page, "03_endo_visit_043_protocol_light.png", "EMK Form 043/u with CBCT 3D Sync & SOAP Note (Light)");

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENE 4: Interactive Clinical Canal Log Modal (EndoCanalLogModal)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[SCENE 4] Opening Interactive Canal Log Modal...");
    await page.goto("http://127.0.0.1:5173/endo_visit_preview.html?view=modal", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    await applyTheme(page, "dark");
    await captureScreen(page, "04_endo_canal_modal_journal_dark.png", "Interactive Endo Canal Journal Modal (Dark)");

    await applyTheme(page, "light");
    await captureScreen(page, "04_endo_canal_modal_journal_light.png", "Interactive Endo Canal Journal Modal (Light)");

    console.log("\n=== ALL 8 RED TEAM INQUISITION SCREENSHOTS CAPTURED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("[ERROR] Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
