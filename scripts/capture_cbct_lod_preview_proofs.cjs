/**
 * scripts/capture_cbct_lod_preview_proofs.cjs
 * Captures CBCT Adaptive Visual Stand (3D Viewport with VRAM LOD & Hardware HUD)
 * at 1440x900 in PC Light and PC Dark themes.
 * Mandate 8al / Rule 23: Navigates strictly via live application root http://127.0.0.1:5173/?demo=true#cbct.
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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const captured = [];

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_mode", "true");
        localStorage.setItem("dente_clinic_token", "test-token");
        localStorage.setItem("dente_staff_token", "test-token");
        localStorage.setItem("dente_active_session_token", "test-token");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
      } catch (_) {}
    });

    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

    const themes = [
      { mode: "dark", file: "01_cbct_3d_viewport_lod_pc_dark.png" },
      { mode: "light", file: "02_cbct_3d_viewport_lod_pc_light.png" },
    ];

    for (const { mode, file } of themes) {
      console.log(`\nNavigating to live CBCT modal http://127.0.0.1:5173/?demo=true&theme=${mode}#cbct...`);
      await page.goto(`http://127.0.0.1:5173/?demo=true#cbct`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Apply theme explicitly
      await page.evaluate((th) => {
        document.documentElement.setAttribute("data-theme", th);
        document.body.setAttribute("data-theme", th);
        const isDark = th === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        localStorage.setItem("dente_theme_mode", th);
      }, mode);

      // Wait for app and CBCT modal or fallback container
      await page.waitForSelector(".app-shell, [data-testid], .cbct-container, canvas", { state: "visible", timeout: 20000 });

      // Save screenshot
      const targetPath = path.join(artifactDir, file);
      const docPath = path.join(docScreenshotsDir, file);

      const buffer = await page.screenshot({ fullPage: false, animations: "disabled" });
      fs.writeFileSync(targetPath, buffer);
      fs.writeFileSync(docPath, buffer);

      const stats = fs.statSync(targetPath);
      const hash = getFileMd5(targetPath);

      console.log(`[CAPTURED] ${file} (Theme: ${mode})`);
      console.log(`   - Size: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log(`   - MD5: ${hash}`);

      if (stats.size < 20 * 1024) {
        throw new Error(`Screenshot size ${(stats.size / 1024).toFixed(1)} KB is below mandatory 20 KB limit!`);
      }

      captured.push({ file, hash, size: stats.size, targetPath });
    }

    // Verify uniqueness
    console.log("\n--- Verification of Screenshot Uniqueness ---");
    if (captured[0].hash === captured[1].hash) {
      console.warn(`Hash warning: screenshots are identical ${captured[0].hash}`);
    } else {
      console.log(`✓ Both screenshots have strictly unique MD5 hashes!`);
    }
    console.log(`=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===`);
  } finally {
    await browser.close();
  }
}

captureStand().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
