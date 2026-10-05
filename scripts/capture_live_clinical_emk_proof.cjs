const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
const BRAIN_DIR = path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e99ad5c9-e8e6-4b58-825a-9029fbbeb880");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function safeLoginAndCapture(viewport, isMobile, theme, suffix) {
  console.log(`[Playwright] Running live capture for ${suffix} (theme: ${theme}, mobile: ${isMobile})...`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
    hasTouch: isMobile,
  });

  const page = await context.newPage();

  // Navigate to live app root
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Set theme & dismiss tours in localStorage
  await page.evaluate((th) => {
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      document.documentElement.setAttribute("data-theme", th);
      document.body.className = `theme-${th}`;
    } catch (e) {}
  }, theme);

  // Click "Быстрый вход в Демо-тур"
  const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
  if (await demoBtn.count() > 0) {
    console.log(`[Playwright] Opening Demo Tour modal for ${suffix}...`);
    await demoBtn.click();
    await page.waitForTimeout(1200);

    const launchBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await launchBtn.count() > 0) {
      console.log(`[Playwright] Clicking launch button for ${suffix}...`);
      await launchBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Remove any remaining tour spotlight overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // 1. Capture Patients View (default view on therapist login)
  console.log(`[Playwright] Capturing Patients view for ${suffix}...`);
  await page.waitForTimeout(1500);
  const shotPatients = path.join(OUT_DIR, `proof_live_patients_${suffix}.png`);
  await page.screenshot({ path: shotPatients, fullPage: false });
  fs.copyFileSync(shotPatients, path.join(BRAIN_DIR, `proof_live_patients_${suffix}.png`));
  console.log(`[Playwright] Saved patients: ${shotPatients}`);

  // 2. Navigate to Visit / EMK view
  console.log(`[Playwright] Navigating to Visit / EMK for ${suffix}...`);
  const visitSidebarBtn = page.locator("aside button:has-text('Прием'), aside button:has-text('Карта и дневник'), [data-view='visit'], nav button:has-text('Прием')").first();
  if (await visitSidebarBtn.count() > 0) {
    await visitSidebarBtn.click();
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
    });
    const shotVisit = path.join(OUT_DIR, `proof_live_visit_emk_${suffix}.png`);
    await page.screenshot({ path: shotVisit, fullPage: false });
    fs.copyFileSync(shotVisit, path.join(BRAIN_DIR, `proof_live_visit_emk_${suffix}.png`));
    console.log(`[Playwright] Saved visit: ${shotVisit}`);
  } else {
    console.warn(`[Playwright] Visit sidebar button not found for ${suffix}`);
  }

  await context.close();
  await browser.close();
}

async function run() {
  await safeLoginAndCapture({ width: 1440, height: 900 }, false, "light", "pc_light");
  await safeLoginAndCapture({ width: 1440, height: 900 }, false, "dark", "pc_dark");
  await safeLoginAndCapture({ width: 390, height: 844 }, true, "light", "mobile_light");
  await safeLoginAndCapture({ width: 390, height: 844 }, true, "dark", "mobile_dark");
  console.log("[Playwright] All live application proofs captured successfully!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
