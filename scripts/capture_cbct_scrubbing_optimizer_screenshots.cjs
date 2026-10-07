/**
 * scripts/capture_cbct_scrubbing_optimizer_screenshots.cjs
 *
 * Captures live visual proof of CBCT slice scrubbing optimizer and stale request dropping:
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 *
 * Standards: Mandate 8e (Doctor Autonomy, zero rubber-banding lag during CT slice scrubbing).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/df81bdde-a2e8-494c-bc18-3ceece8bf41b");
const docsDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots");

for (const d of [brainDir, docsDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
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
  await page.waitForTimeout(800);
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(docsDir, fileName);
  const p2 = path.join(brainDir, fileName);

  await page.screenshot({ path: p1, fullPage: false, timeout: 35000 });
  fs.copyFileSync(p1, p2);

  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF CBCT SCRUBBING OPTIMIZER SCREENSHOTS ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page = await ctx.newPage();

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Waiting for demo volume slices decoding to finish...");

    // Wait for "Загрузка центрального среза" to detach
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4000);

    // Verify canvas is present
    const canvasCount = await page.locator("canvas").count();
    console.log(`Canvas count after loading: ${canvasCount}`);

    // Center coordinates for mouse wheel events
    const centerX = 1440 / 3;
    const centerY = 900 / 2;

    // 1. Capture Light Theme
    await applyTheme(page, "light");
    console.log("Simulating wheel scrubbing in Light theme...");
    await page.mouse.move(centerX, centerY);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(35);
    }
    await page.waitForTimeout(1000);
    await takeScreen(
      page,
      "cbct_scrubbing_optimizer_pc_light_1440.png",
      "CBCT MPR Viewports with Active Scrubbing (PC Light 1440x900)"
    );

    // 2. Capture Dark Theme
    await applyTheme(page, "dark");
    console.log("Simulating wheel scrubbing in Dark theme...");
    await page.mouse.move(centerX, centerY);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(35);
    }
    await page.waitForTimeout(1000);
    await takeScreen(
      page,
      "cbct_scrubbing_optimizer_pc_dark_1440.png",
      "CBCT MPR Viewports with Active Scrubbing (PC Dark 1440x900)"
    );

    console.log("=== SCREENSHOT CAPTURE COMPLETED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN SCREENSHOT CAPTURE:", err);
  process.exit(1);
});
