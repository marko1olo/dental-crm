/**
 * scripts/capture_cbct_lod_preview_proofs.cjs
 * Captures CBCT Adaptive Visual Stand (3D Viewport with VRAM LOD & Hardware HUD)
 * at 1440x900 in PC Light and PC Dark themes.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c711ff70-3050-4202-96f8-1c06182bfa12");
const docScreenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_vram_lod");

[artifactDir, docScreenshotsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function getFileMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

async function captureStand() {
  console.log("=== STARTING CAPTURE OF CBCT ADAPTIVE STAND (1440x900) ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const captured = [];

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

    const themes = [
      { mode: "dark", file: "01_cbct_3d_viewport_lod_pc_dark.png" },
      { mode: "light", file: "02_cbct_3d_viewport_lod_pc_light.png" },
    ];

    for (const { mode, file } of themes) {
      console.log(`\nNavigating to http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=${mode}...`);
      await page.goto(`http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=${mode}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for 3D canvas and raymarching to render
      await page.waitForSelector("canvas", { timeout: 15000 });
      console.log("Canvas detected, waiting 3 seconds for WebGL2 raymarching stabilization...");
      await page.waitForTimeout(3000);

      // Save screenshot
      const targetPath = path.join(artifactDir, file);
      const docPath = path.join(docScreenshotsDir, file);

      await page.screenshot({ path: targetPath, fullPage: false });
      fs.copyFileSync(targetPath, docPath);

      const stats = fs.statSync(targetPath);
      const hash = getFileMd5(targetPath);

      console.log(`[CAPTURED] ${file} (Theme: ${mode})`);
      console.log(`   - Size: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log(`   - MD5: ${hash}`);

      if (stats.size < 40 * 1024) {
        throw new Error(`Screenshot size ${(stats.size / 1024).toFixed(1)} KB is below mandatory 40 KB limit!`);
      }

      captured.push({ file, hash, size: stats.size, targetPath });
    }

    // Verify uniqueness
    console.log("\n--- Verification of Screenshot Uniqueness ---");
    if (captured[0].hash === captured[1].hash) {
      throw new Error(`Hash collision: screenshots are identical! ${captured[0].hash}`);
    }
    console.log(`✓ Both screenshots have strictly unique MD5 hashes!`);
    console.log(`✓ Dark:  ${captured[0].file} (${(captured[0].size / 1024).toFixed(1)} KB) MD5: ${captured[0].hash}`);
    console.log(`✓ Light: ${captured[1].file} (${(captured[1].size / 1024).toFixed(1)} KB) MD5: ${captured[1].hash}`);
    console.log(`=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===`);
  } finally {
    await browser.close();
  }
}

captureStand().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
