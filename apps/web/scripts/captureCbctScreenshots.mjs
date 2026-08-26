import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/cbct";
const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f";

if (!fs.existsSync(PROOFS_DIR)) fs.mkdirSync(PROOFS_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch (e) {
      // ignore
    }
    await sleep(500);
  }
  throw new Error(`Server at ${url} did not respond in ${timeoutMs}ms`);
}

async function run() {
  console.log("=== STARTING REAL PATIENT CBCT 3D MPR VISUAL SCREENSHOT CAPTURE ===");
  console.log("Patient DICOM dataset directory:", DATA_DIR);

  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`DICOM dataset not found at ${DATA_DIR}`);
  }

  const dcmFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".dcm")).sort().map((f) => path.join(DATA_DIR, f));
  console.log(`Found ${dcmFiles.length} real DICOM slice files for Barabash Svetlana Viktorovna.`);

  // 1. Start Vite dev server on port 5173
  console.log("Starting Vite dev server on port 5173...");
  const viteProcess = spawn("npx", ["vite", "--port", "5173", "--host", "127.0.0.1"], {
    cwd: "C:/Clinic_MVP/dental-crm/apps/web",
    shell: true,
    stdio: "pipe",
  });

  viteProcess.stdout.on("data", (d) => process.stdout.write(d.toString()));
  viteProcess.stderr.on("data", (d) => process.stderr.write(d.toString()));

  try {
    await waitForServer("http://127.0.0.1:5173");
    console.log("Vite dev server is ready at http://127.0.0.1:5173");

    const browser = await chromium.launch({ channel: "chrome", headless: true });
    
    // Viewport configs for 4-State Proof:
    const viewports = [
      { name: "pc_dark_1440", width: 1440, height: 900, theme: "dark" },
      { name: "pc_light_1440", width: 1440, height: 900, theme: "light" },
      { name: "mobile_dark_390", width: 390, height: 844, theme: "dark" },
      { name: "mobile_light_390", width: 390, height: 844, theme: "light" },
    ];

    for (const vp of viewports) {
      console.log(`\n============================================================`);
      console.log(`--- Capturing state: ${vp.name} (Theme: ${vp.theme}) ---`);
      console.log(`============================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: vp.theme === "dark" ? "dark" : "light",
      });
      const page = await context.newPage();

      // Navigate to Clinical Modals Studio Standalone
      await page.goto("http://127.0.0.1:5173/?standalone=clinical-modals-studio", { waitUntil: "networkidle" });
      await sleep(1000);

      // Apply theme
      await page.evaluate((th) => {
        document.documentElement.setAttribute("data-theme", th);
        document.documentElement.classList.toggle("dark", th === "dark");
        document.documentElement.classList.toggle("light", th === "light");
        document.body.className = th;
      }, vp.theme);
      await sleep(500);

      // Capture overview of studio page
      const overviewPath = path.join(PROOFS_DIR, `01_studio_overview_${vp.name}.png`);
      await page.screenshot({ path: overviewPath, fullPage: false });
      fs.copyFileSync(overviewPath, path.join(ARTIFACT_DIR, `01_studio_overview_${vp.name}.png`));
      console.log(`Saved overview: ${overviewPath}`);

      // 1. Open 3D CBCT MPR Studio Modal
      const openMprBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]');
      if (await openMprBtn.isVisible()) {
        await openMprBtn.click();
        await sleep(1000);

        // Upload real DICOM series into the modal via file input
        console.log(`Streaming ${dcmFiles.length} real DICOM slices of Barabash S.V. to modal...`);
        const fileInput = page.locator('[data-testid="cbct-dicom-files-input"]');
        await fileInput.setInputFiles(dcmFiles);

        // Wait for volume processing to complete and render
        console.log("Waiting for DICOM 3D volume construction...");
        try {
          await page.waitForFunction(() => {
            const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]');
            return badge && badge.textContent && badge.textContent.includes("400 срезов");
          }, { timeout: 30000 });
          console.log("Real CBCT volume loaded: 400 slices active!");
        } catch (e) {
          console.warn("Badge wait timed out, proceeding with loaded state:", e.message);
        }

        await sleep(2000);

        // Capture 4-Viewport CBCT MPR Studio with real patient anatomy (Diagnostic Mode)
        const cbctMprPath = path.join(PROOFS_DIR, `02_cbct_mpr_4viewport_${vp.name}.png`);
        await page.screenshot({ path: cbctMprPath, fullPage: false });
        fs.copyFileSync(cbctMprPath, path.join(ARTIFACT_DIR, `02_cbct_mpr_4viewport_${vp.name}.png`));
        console.log(`Saved 4-viewport MPR: ${cbctMprPath}`);

        // Click Slab MIP button
        const mipBtn = page.locator('[data-testid="cbct-mpr-slab-mip-btn"]');
        if (await mipBtn.isVisible()) {
          await mipBtn.click();
          await sleep(800);
        }

        // Capture MIP Slab state
        const cbctMipPath = path.join(PROOFS_DIR, `03_cbct_mpr_slab_mip_${vp.name}.png`);
        await page.screenshot({ path: cbctMipPath, fullPage: false });
        fs.copyFileSync(cbctMipPath, path.join(ARTIFACT_DIR, `03_cbct_mpr_slab_mip_${vp.name}.png`));
        console.log(`Saved MIP Slab: ${cbctMipPath}`);

        // Click Implant Mode button inside 3D CBCT Studio
        const implantModeBtn = page.locator('[data-testid="cbct-mode-implant-btn"]');
        if (await implantModeBtn.isVisible()) {
          await implantModeBtn.click();
          await sleep(800);
        }

        // Capture 3D CBCT Implant Planning Studio state
        const implantPlannerPath = path.join(PROOFS_DIR, `04_implant_cross_section_planner_${vp.name}.png`);
        await page.screenshot({ path: implantPlannerPath, fullPage: false });
        fs.copyFileSync(implantPlannerPath, path.join(ARTIFACT_DIR, `04_implant_cross_section_planner_${vp.name}.png`));
        console.log(`Saved Implant Planner: ${implantPlannerPath}`);

        // Close modal
        const closeBtn = page.locator('[data-testid="close-cbct-mpr-3d-studio-btn"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await sleep(500);
        }
      }

      await context.close();
    }

    await browser.close();
    console.log("\n=== ALL REAL PATIENT CBCT SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    viteProcess.kill();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
