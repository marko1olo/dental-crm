/**
 * scripts/capture_warehouse_proofs.cjs
 *
 * Captures live Edge Playwright 1440x900 screenshots (PC Light & Dark)
 * for the Warehouse & Inventory Suite (Mandates 8e, 8n, 8s, 8v, 8z).
 */

const path = require("node:path");
const fs = require("node:fs");
const { launchSafeBrowser } = require("./safe_playwright.cjs");

const CONV_ID = "d161ac7c-7953-493c-9054-d18e0da68db2";
const PARENT_ID = "df880520-dc90-48e7-ab9e-032bd60d9f31";
const ARTIFACTS_DIRS = [
  path.join("C:/Users/Admin/.gemini/antigravity/brain", CONV_ID),
  path.join("C:/Users/Admin/.gemini/antigravity/brain", PARENT_ID),
];
const LOCAL_DIR = path.resolve(__dirname, "../apps/web/public/screenshots/warehouse");
const TARGET_URL = "http://127.0.0.1:5173/warehouse_overview_preview.html";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProofScreenshot(page, filename) {
  const localPath = path.join(LOCAL_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  console.log(`[PROOF] Saved local screenshot: ${localPath}`);

  for (const artDir of ARTIFACTS_DIRS) {
    try {
      fs.mkdirSync(artDir, { recursive: true });
      const artPath = path.join(artDir, filename);
      fs.copyFileSync(localPath, artPath);
      console.log(`[PROOF] Copied to artifact: ${artPath}`);
    } catch (err) {
      console.warn(`[PROOF] Failed to copy to ${artDir}: ${err.message}`);
    }
  }

  // Validate size
  const stats = fs.statSync(localPath);
  console.log(`[PROOF] File: ${filename}, Size: ${stats.size} bytes`);
  if (stats.size < 40000) {
    throw new Error(`Screenshot ${filename} is suspiciously small (${stats.size} bytes). Rejected.`);
  }
}

async function main() {
  console.log(">>> [WAREHOUSE RED TEAM] Starting Edge Playwright capture (1440x900)...");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const browser = await launchSafeBrowser({
    channel: "msedge",
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    console.log(`Navigating to ${TARGET_URL}...`);
    const resp = await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!resp || resp.status() !== 200) {
      throw new Error(`Target page returned status ${resp ? resp.status() : "null"}`);
    }

    // Wait for the tab to render
    await page.waitForSelector('[data-testid="warehouse-overview-tab"]', { timeout: 15000 });
    await wait(1000);

    // 1. Capture PC Light
    console.log("Capturing warehouse_overview_pc_light.png...");
    await saveProofScreenshot(page, "warehouse_overview_pc_light.png");

    // 2. Switch to Dark Mode
    console.log("Switching to dark theme...");
    await page.click('[data-testid="btn-toggle-theme"]');
    await wait(600);

    // Verify dark class or attribute
    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains("dark") ||
             document.documentElement.getAttribute("data-theme") === "dark";
    });
    console.log(`Dark theme applied: ${isDark}`);

    // Capture PC Dark Overview
    console.log("Capturing warehouse_overview_pc_dark.png...");
    await saveProofScreenshot(page, "warehouse_overview_pc_dark.png");

    // Switch back to Light Mode for additional tabs
    await page.click('[data-testid="btn-toggle-theme"]');
    await wait(400);

    // 3. Capture Waybills Tab
    console.log("Navigating to Waybills Tab...");
    await page.click('[data-testid="tab-waybills"]');
    await page.waitForSelector('[data-testid="warehouse-waybills-tab"]', { timeout: 10000 });
    await wait(600);
    console.log("Capturing warehouse_waybills_pc_light.png...");
    await saveProofScreenshot(page, "warehouse_waybills_pc_light.png");

    // 4. Capture Inventory Tab
    console.log("Navigating to Inventory Audit Tab...");
    await page.click('[data-testid="tab-inventory"]');
    await page.waitForSelector('[data-testid="warehouse-inventory-tab"]', { timeout: 10000 });
    await wait(600);
    console.log("Capturing warehouse_inventory_pc_light.png...");
    await saveProofScreenshot(page, "warehouse_inventory_pc_light.png");

    console.log(">>> [WAREHOUSE RED TEAM] All screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
