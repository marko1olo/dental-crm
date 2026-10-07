/**
 * scripts/capture_pricelist_and_prescriptions_screenshots.cjs
 * Visual proof for Price Lists, Nomenclature 804n, Catalog and Prescription 1094n Modal.
 */

const { launchSafeBrowser } = require("./safe_playwright.cjs");
const path = require("node:path");
const fs = require("node:fs");

const outputDirCurrent = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\cc2a29e9-789e-4028-8cea-479b81c74231";
const outputDirPrev = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8a9fd240-1947-4348-80d8-366567196d7b";

async function saveScreenshot(page, filename) {
  const pCurrent = path.join(outputDirCurrent, filename);
  await page.screenshot({ path: pCurrent, fullPage: false });
  try {
    const pPrev = path.join(outputDirPrev, filename);
    fs.copyFileSync(pCurrent, pPrev);
  } catch (e) {}
  console.log(`Saved screenshot: ${pCurrent}`);
}

async function main() {
  if (!fs.existsSync(outputDirCurrent)) {
    fs.mkdirSync(outputDirCurrent, { recursive: true });
  }
  if (!fs.existsSync(outputDirPrev)) {
    fs.mkdirSync(outputDirPrev, { recursive: true });
  }

  const browser = await launchSafeBrowser({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });

  const page = await context.newPage();

  // --------------------------------------------------------------------------
  // 1 & 2: Settings Prices Catalog & 804n Mapping (Light & Dark)
  // --------------------------------------------------------------------------
  console.log("Navigating to Pricelist 804n Studio (Light)...");
  await page.goto("http://127.0.0.1:5173/pricelist_scanner_preview.html?mode=diff&theme=light", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1000);

  console.log("Capturing 01_Settings_Prices_Catalog_Light.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("light");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "01_Settings_Prices_Catalog_Light.png");

  console.log("Capturing 02_Settings_Prices_Catalog_Dark.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("dark");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "02_Settings_Prices_Catalog_Dark.png");

  // --------------------------------------------------------------------------
  // 3 & 4: Settings Prices AI Import Studio (Dark & Light)
  // --------------------------------------------------------------------------
  console.log("Switching to Import Studio tab...");
  const uploadTabBtn = page.locator('button:has-text("1. Зона загрузки"), button:has-text("Загрузка")').first();
  if (await uploadTabBtn.isVisible()) {
    await uploadTabBtn.click();
    await page.waitForTimeout(800);
  }

  console.log("Capturing 03_Settings_Prices_Import_Dark.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("dark");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "03_Settings_Prices_Import_Dark.png");

  console.log("Capturing 04_Settings_Prices_Import_Light.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("light");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "04_Settings_Prices_Import_Light.png");

  // --------------------------------------------------------------------------
  // 5 & 6: Statutory Prescription 1094n Modal (Form 107-1/u) (Light & Dark)
  // --------------------------------------------------------------------------
  console.log("Navigating to Prescription 1094n Modal Preview...");
  await page.goto("http://127.0.0.1:5173/prescription_modal_preview.html?theme=light", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="prescription-print-modal"]', { timeout: 15000 });
  await page.waitForTimeout(800);

  console.log("Capturing 05_Prescription_Modal_107_Light.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("light");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "05_Prescription_Modal_107_Light.png");

  console.log("Capturing 06_Prescription_Modal_107_Dark.png...");
  await page.evaluate(() => {
    if (typeof window.__setPreviewTheme === "function") window.__setPreviewTheme("dark");
  });
  await page.waitForTimeout(400);
  await saveScreenshot(page, "06_Prescription_Modal_107_Dark.png");

  // --------------------------------------------------------------------------
  // 7: Statutory Prescription Modal (Form 148-1/u-88) (Dark)
  // --------------------------------------------------------------------------
  console.log("Switching to Form 148-1/u-88...");
  const form148Btn = page.locator('.dente-segmented-item:has-text("148-1/у-88"), button:has-text("148-1/у-88")').first();
  if (await form148Btn.isVisible()) {
    await form148Btn.click();
    await page.waitForTimeout(600);
  }

  console.log("Capturing 07_Prescription_Modal_148_Dark.png...");
  await saveScreenshot(page, "07_Prescription_Modal_148_Dark.png");

  await browser.close();
  console.log("All screenshots captured successfully in:", outputDirCurrent);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
