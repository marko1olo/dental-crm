const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capturePediatricProofs() {
  console.log("[Playwright] Starting Pediatric Mobile HIG & Zero Bird Language proof capture...");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const TARGET_URL = "http://127.0.0.1:5173/pediatric_mobile_preview.html";

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. MOBILE 390x844 (iPhone 14 / Apple HIG Touch Cockpit)
    // ─────────────────────────────────────────────────────────────
    console.log("[Playwright] Launching Mobile 390x844 context...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(TARGET_URL, { waitUntil: "networkidle" });
    await mobilePage.waitForSelector('[data-testid="pediatric-preview-root"]', { timeout: 15000 });
    await mobilePage.waitForSelector('[data-testid="pediatric-mobile-quadrant-view"]', { timeout: 10000 });
    await mobilePage.waitForSelector('[data-testid="pediatric-mobile-bottom-bar"]', { timeout: 10000 });

    // 1.1 Mobile Light Mode (390x844)
    console.log("[Playwright] Capturing ☀️ Mobile Light (390x844)...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await mobilePage.waitForTimeout(600);
    const mobileLightPath = path.resolve(OUT_DIR, "proof_pediatric_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    console.log("[Playwright] Saved:", mobileLightPath);

    // 1.2 Mobile Dark Mode (390x844)
    console.log("[Playwright] Capturing 🌙 Mobile Dark (390x844)...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await mobilePage.waitForTimeout(600);
    const mobileDarkPath = path.resolve(OUT_DIR, "proof_pediatric_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log("[Playwright] Saved:", mobileDarkPath);

    // 1.3 Mobile Full Scroll (to show full protocol text & Floating Bottom Bar adhesion)
    console.log("[Playwright] Capturing 🌙 Mobile Scrolled with Floating Bottom Bar...");
    await mobilePage.evaluate(() => window.scrollBy(0, 400));
    await mobilePage.waitForTimeout(400);
    const mobileScrolledPath = path.resolve(OUT_DIR, "proof_pediatric_mobile_scrolled_dark.png");
    await mobilePage.screenshot({ path: mobileScrolledPath, fullPage: false });
    console.log("[Playwright] Saved:", mobileScrolledPath);

    await mobileContext.close();

    // ─────────────────────────────────────────────────────────────
    // 2. PC / DESKTOP 1440x900 (Chairside PC Cockpit)
    // ─────────────────────────────────────────────────────────────
    console.log("[Playwright] Launching Desktop 1440x900 context...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(TARGET_URL, { waitUntil: "networkidle" });
    await desktopPage.waitForSelector('[data-testid="pediatric-preview-root"]', { timeout: 15000 });
    await desktopPage.waitForSelector('[data-testid="pediatric-upper-arch"]', { timeout: 10000 });

    // 2.1 PC Light Mode (1440x900)
    console.log("[Playwright] Capturing ☀️ PC Light (1440x900)...");
    await desktopPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await desktopPage.waitForTimeout(600);
    const pcLightPath = path.resolve(OUT_DIR, "proof_pediatric_pc_light.png");
    await desktopPage.screenshot({ path: pcLightPath, fullPage: false });
    console.log("[Playwright] Saved:", pcLightPath);

    // 2.2 PC Dark Mode (1440x900)
    console.log("[Playwright] Capturing 🌙 PC Dark (1440x900)...");
    await desktopPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await desktopPage.waitForTimeout(600);
    const pcDarkPath = path.resolve(OUT_DIR, "proof_pediatric_pc_dark.png");
    await desktopPage.screenshot({ path: pcDarkPath, fullPage: false });
    console.log("[Playwright] Saved:", pcDarkPath);

    await desktopContext.close();
    console.log("[Playwright] All 4-State Visual Proofs captured successfully!");
  } catch (err) {
    console.error("[Playwright] Capture failed:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

capturePediatricProofs().catch((err) => {
  console.error("Fatal capture error:", err);
  process.exit(1);
});
