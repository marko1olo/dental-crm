const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "45ebee44-9391-4430-8998-d4e1f238103f";
const PARENT_ID = "beb92312-c6d7-426d-a438-12dcad022abc";
const ARTIFACTS_DIRS = [
  path.join("C:/Users/Admin/.gemini/antigravity/brain", CONV_ID),
  path.join("C:/Users/Admin/.gemini/antigravity/brain", PARENT_ID),
];
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/warehouse_sanpin";
const WEB_BASE = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveScreenshots(page, baseName) {
  const localPath = path.join(LOCAL_DIR, `${baseName}.png`);
  await page.screenshot({ path: localPath, fullPage: false });
  console.log(`Saved local: ${localPath}`);

  for (const artDir of ARTIFACTS_DIRS) {
    try {
      fs.mkdirSync(artDir, { recursive: true });
      const artPath = path.join(artDir, `${baseName}.png`);
      fs.copyFileSync(localPath, artPath);
      console.log(`Copied artifact: ${artPath}`);
    } catch (e) {
      console.warn(`Artifact copy error: ${e.message}`);
    }
  }
}

async function run() {
  console.log("Capturing Dental Lab Orders Hub proofs...");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // 1. Light theme Hub
    console.log("Loading Hub in Light theme...");
    await page.goto(`${WEB_BASE}/lab_orders_preview.html?tab=hub&theme=light`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".ztl-filter-bar, .ztl-search-input, .ztl-modal-inner", { timeout: 15000 });
    await wait(1200);
    await saveScreenshots(page, "proof_dental_lab_orders_pc_light");

    // 2. Dark theme Hub
    console.log("Loading Hub in Dark theme...");
    await page.goto(`${WEB_BASE}/lab_orders_preview.html?tab=hub&theme=dark`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".ztl-filter-bar, .ztl-search-input, .ztl-modal-inner", { timeout: 15000 });
    await wait(1200);
    await saveScreenshots(page, "proof_dental_lab_orders_pc_dark");

    console.log("Dental Lab Hub proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
