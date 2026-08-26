import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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
  console.log("=== STARTING CBCT 3D MPR VISUAL SCREENSHOT CAPTURE ===");
  
  // 1. Start Vite dev server on port 5173
  console.log("Starting Vite dev server...");
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
      console.log(`\n--- Capturing state: ${vp.name} (Theme: ${vp.theme}) ---`);
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
      console.log(`Saved: ${overviewPath}`);

      // 1. Open 3D CBCT MPR Studio Modal
      const openMprBtn = page.locator('[data-testid="open-cbct-mpr-3d-studio-modal-btn"]');
      if (await openMprBtn.isVisible()) {
        await openMprBtn.click();
        await sleep(1200);

        // Capture 4-Viewport CBCT MPR Studio
        const cbctMprPath = path.join(PROOFS_DIR, `02_cbct_mpr_4viewport_${vp.name}.png`);
        await page.screenshot({ path: cbctMprPath, fullPage: false });
        fs.copyFileSync(cbctMprPath, path.join(ARTIFACT_DIR, `02_cbct_mpr_4viewport_${vp.name}.png`));
        console.log(`Saved: ${cbctMprPath}`);

        // Click Slab MIP button
        const mipBtn = page.locator('[data-testid="cbct-mpr-slab-mip-btn"]');
        if (await mipBtn.isVisible()) {
          await mipBtn.click();
          await sleep(400);
        }

        // Switch to Maxilla jaw
        const maxillaBtn = page.locator('[data-testid="cbct-jaw-maxilla-btn"]');
        if (await maxillaBtn.isVisible()) {
          await maxillaBtn.click();
          await sleep(400);
        }

        // Capture MIP Slab state
        const cbctMipPath = path.join(PROOFS_DIR, `03_cbct_mpr_slab_mip_${vp.name}.png`);
        await page.screenshot({ path: cbctMipPath, fullPage: false });
        fs.copyFileSync(cbctMipPath, path.join(ARTIFACT_DIR, `03_cbct_mpr_slab_mip_${vp.name}.png`));
        console.log(`Saved: ${cbctMipPath}`);

        // Close modal
        const closeBtn = page.locator('[data-testid="close-cbct-mpr-3d-studio-btn"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await sleep(500);
        }
      }

      // 2. Open 2D Implant Cross-Section Planner Modal
      const openImplantBtn = page.locator('[data-testid="open-implant-cross-section-planner-modal-btn"]');
      if (await openImplantBtn.isVisible()) {
        await openImplantBtn.click();
        await sleep(1200);

        // Capture 2D Cross Section Implant Planner
        const implantPlannerPath = path.join(PROOFS_DIR, `04_implant_cross_section_planner_${vp.name}.png`);
        await page.screenshot({ path: implantPlannerPath, fullPage: false });
        fs.copyFileSync(implantPlannerPath, path.join(ARTIFACT_DIR, `04_implant_cross_section_planner_${vp.name}.png`));
        console.log(`Saved: ${implantPlannerPath}`);

        // Close modal
        const closeImplantBtn = page.locator('[data-testid="close-implant-planner-modal-btn"]').first();
        if (await closeImplantBtn.isVisible()) {
          await closeImplantBtn.click();
          await sleep(500);
        }
      }

      await context.close();
    }

    await browser.close();
    console.log("\n=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    viteProcess.kill();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
