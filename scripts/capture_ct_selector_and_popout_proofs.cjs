/**
 * scripts/capture_ct_selector_and_popout_proofs.cjs
 * Red Team Inquisitor Visual Proofmaker
 *
 * Captures 6 high-resolution screenshots (1440x900):
 * 1. CT Selector Modal - Light (1440x900)
 * 2. CT Selector Modal - Dark (1440x900)
 * 3. CT Popout Studio - Light (1440x900)
 * 4. CT Popout Studio - Dark (1440x900)
 * 5. Imaging Header CT Quickbar - Light (1440x900)
 * 6. Imaging Header CT Quickbar - Dark (1440x900)
 *
 * Enforces Anti-Blank Byte Guard >= 20KB (20,480 bytes)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const MIN_BYTE_SIZE = 20480; // 20 KB

async function main() {
  const screenshotsDir = path.resolve(__dirname, "../docs/screenshots/ct_selector_inquisition");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c26dedf8-c28b-4414-b9e0-7e7d6a88ae49/screenshots");

  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(brainDir, { recursive: true });

  console.log(">>> [Red Team] Launching Playwright Chromium (1440x900)...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedFiles = [];

  try {
    const baseUrl = "http://127.0.0.1:5173/ct_selector_inquisition_preview.html";

    // Dedicated capture function with independent page context per shot
    async function captureShot(url, filename, selectorToWait) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });

      try {
        await page.goto(url);
        if (selectorToWait) {
          await page.waitForSelector(selectorToWait, { visible: true, timeout: 20000 });
        }
        await page.waitForTimeout(1200); // Wait for fonts, transitions and canvas

        const targetPath = path.join(screenshotsDir, filename);
        const brainPath = path.join(brainDir, filename);

        await page.screenshot({ path: targetPath, fullPage: false });
        fs.copyFileSync(targetPath, brainPath);

        const stats = fs.statSync(targetPath);
        if (stats.size < MIN_BYTE_SIZE) {
          throw new Error(`[ANTI-BLANK GUARD FAILURE] ${filename} size is ${stats.size} bytes (< ${MIN_BYTE_SIZE} bytes threshold!)`);
        }

        console.log(`>>> [PROOF VERIFIED] ${filename}: ${stats.size} bytes (>= 20KB OK)`);
        capturedFiles.push({
          name: filename,
          path: targetPath,
          size: stats.size,
        });
      } finally {
        await page.close();
      }
    }

    // ─── 1. CT SELECTOR MODAL (LIGHT 1440x900) ───
    console.log("\n[1/6] Capturing CT Selector Modal (PC Light 1440x900)...");
    await captureShot(`${baseUrl}?view=modal&theme=light`, "ct_selector_modal_pc_light.png", '[data-testid="ct-selector-modal"]');

    // ─── 2. CT SELECTOR MODAL (DARK 1440x900) ───
    console.log("\n[2/6] Capturing CT Selector Modal (PC Dark 1440x900)...");
    await captureShot(`${baseUrl}?view=modal&theme=dark`, "ct_selector_modal_pc_dark.png", '[data-testid="ct-selector-modal"]');

    // ─── 3. CT POPOUT STUDIO (LIGHT 1440x900) ───
    console.log("\n[3/6] Capturing CT Popout Studio (PC Light 1440x900)...");
    await captureShot(`${baseUrl}?view=popout&theme=light`, "ct_popout_studio_pc_light.png", '[data-testid="ct-popout-studio"]');

    // ─── 4. CT POPOUT STUDIO (DARK 1440x900) ───
    console.log("\n[4/6] Capturing CT Popout Studio (PC Dark 1440x900)...");
    await captureShot(`${baseUrl}?view=popout&theme=dark`, "ct_popout_studio_pc_dark.png", '[data-testid="ct-popout-studio"]');

    // ─── 5. IMAGING HEADER CT QUICKBAR (LIGHT 1440x900) ───
    console.log("\n[5/6] Capturing Imaging Header CT Quickbar (PC Light 1440x900)...");
    await captureShot(`${baseUrl}?view=quickbar&theme=light`, "imaging_header_ct_quickbar_pc_light.png", '[data-testid="imaging-header-ct-quickbar"]');

    // ─── 6. IMAGING HEADER CT QUICKBAR (DARK 1440x900) ───
    console.log("\n[6/6] Capturing Imaging Header CT Quickbar (PC Dark 1440x900)...");
    await captureShot(`${baseUrl}?view=quickbar&theme=dark`, "imaging_header_ct_quickbar_pc_dark.png", '[data-testid="imaging-header-ct-quickbar"]');

    console.log("\n=======================================================");
    console.log(">>> ALL 6 VISUAL PROOFS SUCCESSFULLY CAPTURED & VALIDATED! <<<");
    console.log("=======================================================");
    for (const f of capturedFiles) {
      console.log(`* ${f.name} -> ${(f.size / 1024).toFixed(1)} KB`);
    }

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(">>> FATAL ERROR in capture script:", err);
  process.exit(1);
});
