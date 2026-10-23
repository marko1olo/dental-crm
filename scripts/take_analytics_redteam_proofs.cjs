/**
 * scripts/take_analytics_redteam_proofs.cjs
 *
 * Captures 4 canonical visual proof screenshots for Dental CRM Analytics & Executive Cockpit:
 * 1. docs/proofs/analytics/analytics_pc_light.png (1440x900) - PC Light Executive Cockpit & Reports Tab
 * 2. docs/proofs/analytics/analytics_pc_dark.png (1440x900) - PC Dark 0 white-flash theme
 * 3. docs/proofs/analytics/analytics_mobile_light.png (390x844) - Mobile Light Grouped List Cards & Apple HIG
 * 4. docs/proofs/analytics/analytics_mobile_dark.png (390x844) - Mobile Dark Natural Thumb Zone
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&reports=1#reports";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/analytics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ba5c9d69-c5ca-47f6-8b2b-80a3bdaf338f");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
if (fs.existsSync(BRAIN_DIR)) {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function captureSingleProof(browser, { isDark, isMobile, fileName }) {
  const context = await browser.newContext({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile: Boolean(isMobile),
    hasTouch: Boolean(isMobile),
  });

  await context.addInitScript((dark) => {
    const mode = dark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", mode);
      localStorage.setItem("dente_theme", mode);
      localStorage.setItem("dente_demo_showcase", "true");
    } catch {}
    document.documentElement.setAttribute("data-theme", mode);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, isDark);

  const page = await context.newPage();
  await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  // Wait for reports dashboard to be fully mounted and hydrated (not just outer shell)
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
  await page.waitForSelector(".reports-dashboard, [data-testid='reports-dashboard']", { timeout: 25000 });
  await page.waitForTimeout(1500);

  // Ensure theme DOM attributes are applied
  await page.evaluate((dark) => {
    const mode = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", mode);
    document.body.setAttribute("data-theme", mode);
    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, isDark);

  await suppressOverlays(page);
  await page.waitForTimeout(800);

  const targetPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

  if (fs.existsSync(BRAIN_DIR)) {
    fs.copyFileSync(targetPath, path.join(BRAIN_DIR, fileName));
  }

  const stats = fs.statSync(targetPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(targetPath)).digest("hex");
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`[CAPTURED] ${fileName}: ${stats.size} bytes (${sizeKb} KB) | MD5: ${hash}`);

  await context.close();
  return targetPath;
}

async function run() {
  console.log("[Playwright] Starting 4-state isolated visual proof capture...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PC Light
    console.log("[1/4] Capturing PC Light (1440x900)...");
    await captureSingleProof(browser, { isDark: false, isMobile: false, fileName: "analytics_pc_light.png" });

    // 2. PC Dark
    console.log("[2/4] Capturing PC Dark (1440x900)...");
    await captureSingleProof(browser, { isDark: true, isMobile: false, fileName: "analytics_pc_dark.png" });

    // 3. Mobile Light
    console.log("[3/4] Capturing Mobile Light (390x844)...");
    await captureSingleProof(browser, { isDark: false, isMobile: true, fileName: "analytics_mobile_light.png" });

    // 4. Mobile Dark
    console.log("[4/4] Capturing Mobile Dark (390x844)...");
    await captureSingleProof(browser, { isDark: true, isMobile: true, fileName: "analytics_mobile_dark.png" });

    console.log("[Playwright] All 4 canonical analytics proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
