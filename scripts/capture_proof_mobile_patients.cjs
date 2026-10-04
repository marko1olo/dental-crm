const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureMobilePatientsProof() {
  console.log("[Playwright] Launching Chrome in iPhone 390x844 resolution...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });

  // 1. Click "Быстрый вход в Демо-тур"
  const quickDemoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур")').first();
  await quickDemoBtn.waitFor({ state: "visible", timeout: 15000 });
  console.log("[Playwright] Found quickDemoBtn, clicking...");
  await quickDemoBtn.click();

  // 2. Click "Войти в демо-тур как Терапевт"
  const enterBtn = page.locator('button:has-text("Войти в демо-тур как Терапевт")').first();
  await enterBtn.waitFor({ state: "visible", timeout: 15000 });
  console.log("[Playwright] Found enterBtn, clicking...");
  await enterBtn.click();
  await page.waitForTimeout(2500);

  // 3. Clear tour overlays
  await page.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // 4. Wait for MobileTabBar and click "Пациенты"
  console.log("[Playwright] Waiting for MobileTabBar...");
  await page.waitForSelector(".mobile-tab-bar", { timeout: 15000 });
  const patientsTab = page.locator('.mobile-tab-item:has-text("Пациенты")').first();
  await patientsTab.waitFor({ state: "visible", timeout: 10000 });
  console.log("[Playwright] Clicking Patients in MobileTabBar...");
  await patientsTab.click();
  await page.waitForTimeout(2000);

  // 5. Wait for the new Apple Health Grouped Inset Card
  console.log("[Playwright] Waiting for [data-testid=\"mobile-grouped-inset-card\"]...");
  await page.waitForSelector('[data-testid="mobile-grouped-inset-card"]', { timeout: 15000 });
  console.log("[Playwright] Found [data-testid=\"mobile-grouped-inset-card\"]!");

  // Clean overlays again just in case
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // 6. Capture LIGHT Mode Proof
  console.log("[Playwright] Capturing LIGHT mode screenshot...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.waitForTimeout(800);

  const lightShot = path.resolve(OUT_DIR, "proof_mobile_patients_grouped_list_light.png");
  await page.screenshot({ path: lightShot });
  console.log("[Playwright] Saved Light Mode Proof:", lightShot);

  // 7. Capture DARK Mode Proof
  console.log("[Playwright] Capturing DARK mode screenshot...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(800);

  const darkShot = path.resolve(OUT_DIR, "proof_mobile_patients_grouped_list_dark.png");
  await page.screenshot({ path: darkShot });
  console.log("[Playwright] Saved Dark Mode Proof:", darkShot);

  await browser.close();
  console.log("[Playwright] Finished successfully!");
}

captureMobilePatientsProof().catch((err) => {
  console.error("[Playwright] Error:", err);
  process.exit(1);
});
