/**
 * scripts/capture-telephony-final-canonical.cjs
 * Captures 4-State Red Team Visual Proof for Telephony:
 * 1. 01_telephony_pc_light_1440x900.png (PC Light, 1440x900)
 * 2. 02_telephony_pc_dark_1440x900.png (PC Dark, 1440x900)
 * 3. 03_telephony_mobile_light_390x844.png (Mobile Light, 390x844)
 * 4. 04_telephony_mobile_dark_390x844.png (Mobile Dark, 390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActivePort() {
  for (const port of [5173, 5174, 5175, 5176]) {
    if (await checkPort(port)) {
      return port;
    }
  }
  return 5173;
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, theme);
  await page.waitForTimeout(400);
}

async function run() {
  console.log("=== Launching Playwright Chromium for Canonical Telephony Proofs ===");
  const port = await findActivePort();
  const url = `http://127.0.0.1:${port}/?telephony=true#telephony`;
  console.log(`Using active web port ${port}: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    // Reuse a single context & page to eliminate Vite bundle reload overhead
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log("Navigating to standalone telephony harness...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("Waiting for telephony standalone root selector...");
    await page.waitForSelector('[data-testid="telephony-standalone-root"]', { state: "attached", timeout: 60000 });
    await page.waitForTimeout(1500);

    // -----------------------------------------------------------------
    // 1. DESKTOP (1440x900): PC LIGHT
    // -----------------------------------------------------------------
    console.log("\n[1/4] Capturing 01_telephony_pc_light_1440x900.png...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await setTheme(page, "light");

    // Click expand button to reveal full incoming call card if present
    const expandBtnLight = page.locator('[data-testid="capsule-expand-btn"]');
    if (await expandBtnLight.isVisible().catch(() => false)) {
      console.log("  Expanding incoming call card...");
      await expandBtnLight.click();
      await page.waitForTimeout(600);
    }

    const pcLightPath = path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light.png"));
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`✓ Saved PC Light: ${pcLightPath} (${(pcLightSize / 1024).toFixed(1)} KB)`);

    // -----------------------------------------------------------------
    // 2. DESKTOP (1440x900): PC DARK
    // -----------------------------------------------------------------
    console.log("\n[2/4] Capturing 02_telephony_pc_dark_1440x900.png...");
    await setTheme(page, "dark");
    await page.waitForTimeout(600);

    const pcDarkPath = path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark.png"));
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`✓ Saved PC Dark: ${pcDarkPath} (${(pcDarkSize / 1024).toFixed(1)} KB)`);
    await context.close();

    // -----------------------------------------------------------------
    // 3. MOBILE (390x844 @2x Retina): MOBILE LIGHT
    // -----------------------------------------------------------------
    console.log("\n[3/4] Capturing 03_telephony_mobile_light_390x844.png...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.setDefaultTimeout(60000);
    mobilePage.setDefaultNavigationTimeout(60000);
    await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await mobilePage.waitForSelector('[data-testid="telephony-standalone-root"]', { state: "attached", timeout: 60000 });
    await setTheme(mobilePage, "light");
    await mobilePage.waitForTimeout(600);

    const mobileLightPath = path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_mobile_light.png"));
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`✓ Saved Mobile Light: ${mobileLightPath} (${(mobileLightSize / 1024).toFixed(1)} KB)`);

    // -----------------------------------------------------------------
    // 4. MOBILE (390x844 @2x Retina): MOBILE DARK
    // -----------------------------------------------------------------
    console.log("\n[4/4] Capturing 04_telephony_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await mobilePage.waitForTimeout(600);

    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_mobile_dark.png"));
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`✓ Saved Mobile Dark: ${mobileDarkPath} (${(mobileDarkSize / 1024).toFixed(1)} KB)`);
    await mobileContext.close();

    console.log("\n=======================================================");
    console.log("ALL 4 TELEPHONY RED TEAM PROOFS CAPTURED SUCCESSFULLY!");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL capture error:", err);
  process.exit(1);
});
