/**
 * scripts/capture_cbct_scrubbing_screenshots.cjs
 *
 * Captures 1440x900 PC Light & PC Dark screenshots of the CBCT MPR Scrubbing Workbench
 * exercising real mouse wheel scrolling and the superseding slice queue.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/7973c21a-8738-4ed1-aca2-dc92a8c7c825");
const docDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const publicDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");

for (const d of [brainDir, docDir, publicDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function saveScreenshot(page, filename, description) {
  const p1 = path.join(docDir, filename);
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled" });

  // Copy to brain and public dirs
  fs.copyFileSync(p1, path.join(brainDir, filename));
  fs.copyFileSync(p1, path.join(publicDir, filename));

  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${filename} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF CBCT MPR SCRUBBING WORKBENCH ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await ctx.newPage();

    // ─── 1. CAPTURE PC LIGHT (1440x900) ──────────────────────────────────────────
    console.log("[NAV] Loading Light Stand...");
    await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for canvas elements to mount
    await page.waitForSelector("canvas", { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Locate the first MPR canvas (Axial) and simulate rapid wheel scroll
    const axialCanvas = page.locator("canvas").first();
    const box = await axialCanvas.boundingBox();
    if (box) {
      console.log("[SCROLL] Simulating rapid wheel scroll on Axial viewport...");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 15; i++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(1000);
    }

    await saveScreenshot(page, "cbct_mpr_scrubbing_pc_light_1440.png", "PC Light 1440x900 MPR Scrubbing");

    // ─── 2. CAPTURE PC DARK (1440x900) ───────────────────────────────────────────
    console.log("[NAV] Loading Dark Stand...");
    await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector("canvas", { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Simulate rapid wheel scroll on Coronal/Sagittal canvas
    const canvases = await page.locator("canvas").all();
    if (canvases.length > 1) {
      console.log("[SCROLL] Simulating rapid wheel scroll on Coronal viewport...");
      const coronalCanvas = canvases[1];
      const cbox = await coronalCanvas.boundingBox();
      if (cbox) {
        await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
        for (let i = 0; i < 15; i++) {
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(20);
        }
        await page.waitForTimeout(1000);
      }
    }

    await saveScreenshot(page, "cbct_mpr_scrubbing_pc_dark_1440.png", "PC Dark 1440x900 MPR Scrubbing");

    console.log("=== CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in screenshot script:", err);
  process.exit(1);
});
