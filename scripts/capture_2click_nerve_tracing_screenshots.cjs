/**
 * scripts/capture_2click_nerve_tracing_screenshots.cjs
 *
 * Captures 1440x900 Red Team Visual Proof for Mandibular Nerve (IAN) 2-Click Tracing:
 * 1. cbct_nerve_step1_seed1_foramen_mentale.png (Step 1: Seed 1 Foramen mentale placed, HUD Step 2 hint, pulsing green marker)
 * 2. cbct_nerve_step2_fast_marching_complete.png (Step 2: Full Fast Marching 3D trajectory with length badge, bilateral switch)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_nerve"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/9afdc6d8-e89e-4257-91f4-71c2fd455218"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function saveScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false });

  const content = fs.readFileSync(p1);
  const hash = crypto.createHash("md5").update(content).digest("hex");
  const stat = fs.statSync(p1);

  for (let i = 1; i < targetDirs.length; i++) {
    try {
      fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
    } catch (e) {
      console.warn(`Could not copy to ${targetDirs[i]}: ${e.message}`);
    }
  }

  console.log(`[CAPTURED] ${fileName} (${description})`);
  console.log(`  Size: ${(stat.size / 1024).toFixed(1)} KB | MD5: ${hash}`);
  console.log(`  Path: ${p1}\n`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF 2-CLICK NERVE TRACING PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    // ─── 1. CAPTURE STEP 1 (Seed 1 Foramen mentale) ───────────────────────────
    console.log("[NAV] Loading Step 1 Stand (Seed 1: Foramen mentale placed)...");
    await page.goto("http://127.0.0.1:5173/cbct_2click_nerve_preview.html?step=1&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="cbct-nerve-tracing-hud"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await saveScreen(
      page,
      "cbct_nerve_step1_seed1_foramen_mentale.png",
      "Шаг 1: Установлен Seed 1 (Foramen mentale), HUD подсказка для Seed 2, зеленый маркер на срезе"
    );

    // ─── 2. CAPTURE STEP 2 (Complete Fast Marching Trajectory) ────────────────
    console.log("[NAV] Loading Step 2 Stand (Full Fast Marching 3D Trajectory)...");
    await page.goto("http://127.0.0.1:5173/cbct_2click_nerve_preview.html?step=2&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="cbct-nerve-tracing-hud"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await saveScreen(
      page,
      "cbct_nerve_step2_fast_marching_complete.png",
      "Шаг 2: Полная трассировка Fast Marching Vatech, бейдж длины в мм, двусторонний переключатель"
    );

    console.log("=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
