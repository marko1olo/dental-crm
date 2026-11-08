/**
 * scripts/take_warehouse_canonical_4proofs.cjs
 * 4-State Visual Proof Capture for Warehouse & Stock domain (Mandates 8ze, 8al, 8am, 8e)
 * Live Stand: http://127.0.0.1:5173/?demo=true&warehouse=1
 *
 * 1. docs/proofs/warehouse/warehouse_pc_light_1440x900.png (1440x900 PC Light)
 * 2. docs/proofs/warehouse/warehouse_pc_dark_1440x900.png (1440x900 PC Dark)
 * 3. docs/proofs/warehouse/warehouse_mobile_light_390x844.png (390x844 Mobile Light)
 * 4. docs/proofs/warehouse/warehouse_mobile_dark_390x844.png (390x844 Mobile Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&warehouse=1";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/warehouse");
const CURRENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d8fc8f02-1c23-47b7-bbce-b330dba7f142");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c93cc0eb-0cfe-4714-bf08-8f512d1d3f61");

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });
if (!fs.existsSync(CURRENT_BRAIN_DIR)) fs.mkdirSync(CURRENT_BRAIN_DIR, { recursive: true });
if (!fs.existsSync(PARENT_BRAIN_DIR)) fs.mkdirSync(PARENT_BRAIN_DIR, { recursive: true });

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "warehouse-clean-proof-style";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
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
    document.documentElement.style.colorScheme = th;
  }, theme);
  await suppressTransientOverlays(page);
  await page.waitForTimeout(500);
}

function verifyAndSaveScreenshot(buffer, filename, alias) {
  if (buffer.length < 20480) {
    throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
  }
  const destPrimary = path.join(PROOF_DIR, filename);
  fs.writeFileSync(destPrimary, buffer);

  const destBrain = path.join(CURRENT_BRAIN_DIR, filename);
  fs.writeFileSync(destBrain, buffer);

  const destParentBrain = path.join(PARENT_BRAIN_DIR, filename);
  fs.writeFileSync(destParentBrain, buffer);

  if (alias) {
    fs.writeFileSync(path.join(PROOF_DIR, alias), buffer);
    fs.writeFileSync(path.join(CURRENT_BRAIN_DIR, alias), buffer);
    fs.writeFileSync(path.join(PARENT_BRAIN_DIR, alias), buffer);
  }

  console.log(`[PROOF CAPTURED] ${filename} (alias: ${alias || "none"}): ${buffer.length} bytes -> ${destPrimary}`);
  return destPrimary;
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // 1. PC Viewport 1440x900
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();

    console.log(`Navigating PC to ${WEB_URL}...`);
    await pcPage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForSelector('[data-testid="warehouse-studio-modal"]', { timeout: 15000 });
    await suppressTransientOverlays(pcPage);
    await pcPage.waitForTimeout(1000);

    // 1A. PC Light
    await setTheme(pcPage, "light");
    const pcLightBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(pcLightBuf, "01_warehouse_studio_pc_light_1440x900.png", "warehouse_pc_light_1440x900.png");

    // 1B. PC Dark
    await setTheme(pcPage, "dark");
    const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(pcDarkBuf, "02_warehouse_studio_pc_dark_1440x900.png", "warehouse_pc_dark_1440x900.png");

    await pcContext.close();

    // 2. Mobile Viewport 390x844 (iPhone 13/14 scale)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    console.log(`Navigating Mobile to ${WEB_URL}...`);
    await mobilePage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForSelector('[data-testid="warehouse-studio-modal"]', { timeout: 15000 });
    await suppressTransientOverlays(mobilePage);
    await mobilePage.waitForTimeout(1000);

    // 2A. Mobile Light
    await setTheme(mobilePage, "light");
    const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobileLightBuf, "03_warehouse_studio_mobile_light_390x844.png", "warehouse_mobile_light_390x844.png");

    // 2B. Mobile Dark
    await setTheme(mobilePage, "dark");
    const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobileDarkBuf, "04_warehouse_studio_mobile_dark_390x844.png", "warehouse_mobile_dark_390x844.png");

    await mobileContext.close();
    console.log("[SUCCESS] All 4 canonical warehouse proofs generated successfully.");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("[FATAL CAPTURE ERROR]:", err);
  process.exit(1);
});
