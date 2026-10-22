const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/emergency");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function saveProof(page, fileName) {
  const targetPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false });
  const stats = fs.statSync(targetPath);
  console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
  if (stats.size < 20480) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
  return targetPath;
}

async function main() {
  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
  console.log("Using browser binary:", browserPath);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log("Navigating to live Emergency Antishock HUD (Order 786n)...");
    await page.goto(`${WEB_BASE}/?demo=true&emergency=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.locator(".emergency-modal-container").waitFor({ state: "visible", timeout: 15000 });
    console.log("EmergencyRescueModal container confirmed visible!");

    // 1. PC Light (1440x900)
    console.log("--- 1. Capturing Emergency HUD PC Light (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_pc_light.png");

    // 2. PC Dark (1440x900)
    console.log("--- 2. Capturing Emergency HUD PC Dark (1440x900) ---");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_pc_dark.png");

    // 3. Mobile Light (390x844)
    console.log("--- 3. Capturing Emergency HUD Mobile Light (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_mobile_light.png");

    // 4. Mobile Dark (390x844)
    console.log("--- 4. Capturing Emergency HUD Mobile Dark (390x844) ---");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_mobile_dark.png");

    // 5. Kit Tab PC Dark (1440x900)
    console.log("--- 5. Capturing Kit Tab PC Dark (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-testid="emergency-tab-kit"]').click();
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_kit_pc_dark.png");

    // 6. Kit Tab Mobile Dark (390x844)
    console.log("--- 6. Capturing Kit Tab Mobile Dark (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await saveProof(page, "emergency_rescue_kit_mobile_dark.png");

    console.log("\nALL 6 LIVE VISUAL PROOFS SUCCESSFULLY CAPTURED!\n");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL in capture-emergency-rescue-4state:", err);
  process.exit(1);
});
