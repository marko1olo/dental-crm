/**
 * scripts/capture_radiology_inquisition_proofs.cjs
 * Subagent 2 (Radiology & DICOM 3D Viewport Inquisitor)
 *
 * Captures real high-resolution screenshots (1440x900):
 * 1. Radiology Studies Archive - Light (1440x900)
 * 2. Radiology Studies Archive - Dark (1440x900)
 * 3. Direct RVG Capture Modal with 1-row Hick Filters Toolbar - Light (1440x900)
 * 4. Direct RVG Capture Modal with 1-row Hick Filters Toolbar - Dark (1440x900)
 * 5. CBCT 3D Volume Viewport with 8-Projection Skull Toolbar - Dark (1440x900)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const screenshotsDir = path.resolve(__dirname, "../docs/screenshots/radiology_inquisition");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log(">>> Launching Chromium for Radiology Inquisition Visual Capture...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // ─── 1. ARCHIVE LIGHT (1440x900) ───
    console.log(">>> Navigating to Radiology Archive (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/radiology_inquisition_preview.html?view=archive&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="radiology-archive-container"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    const archiveLight = path.join(screenshotsDir, "radiology_archive_light.png");
    await page.screenshot({ path: archiveLight, fullPage: false });
    console.log(`>>> Captured: ${archiveLight} (${fs.statSync(archiveLight).size} bytes)`);

    // ─── 2. ARCHIVE DARK (1440x900) ───
    console.log(">>> Navigating to Radiology Archive (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/radiology_inquisition_preview.html?view=archive&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="radiology-archive-container"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    const archiveDark = path.join(screenshotsDir, "radiology_archive_dark.png");
    await page.screenshot({ path: archiveDark, fullPage: false });
    console.log(`>>> Captured: ${archiveDark} (${fs.statSync(archiveDark).size} bytes)`);

    // ─── 3. DIRECT RVG CAPTURE LIGHT (1440x900) ───
    console.log(">>> Navigating to Direct RVG Capture Modal (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/radiology_inquisition_preview.html?view=rvg&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="rvg-filters-1row-toolbar"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(700);
    const rvgLight = path.join(screenshotsDir, "radiology_rvg_capture_light.png");
    await page.screenshot({ path: rvgLight, fullPage: false });
    console.log(`>>> Captured: ${rvgLight} (${fs.statSync(rvgLight).size} bytes)`);

    // ─── 4. DIRECT RVG CAPTURE DARK (1440x900) ───
    console.log(">>> Navigating to Direct RVG Capture Modal (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/radiology_inquisition_preview.html?view=rvg&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="rvg-filters-1row-toolbar"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(700);
    const rvgDark = path.join(screenshotsDir, "radiology_rvg_capture_dark.png");
    await page.screenshot({ path: rvgDark, fullPage: false });
    console.log(`>>> Captured: ${rvgDark} (${fs.statSync(rvgDark).size} bytes)`);

    // ─── 5. CBCT 3D VOLUME VIEWPORT DARK (1440x900) ───
    console.log(">>> Navigating to CBCT 3D Volume Viewport (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/radiology_inquisition_preview.html?view=cbct3d&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="cbct-viewport-container-volume3d"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(1000);
    const cbctDark = path.join(screenshotsDir, "radiology_cbct_3d_viewport_dark.png");
    await page.screenshot({ path: cbctDark, fullPage: false });
    console.log(`>>> Captured: ${cbctDark} (${fs.statSync(cbctDark).size} bytes)`);

    console.log(">>> ALL 5 RADIOLOGY INQUISITION PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture script:", err);
  process.exit(1);
});
