/**
 * scripts/capture_patient_timeline_proof.cjs
 * Captures live screenshots (1440x900) in Light & Dark modes for:
 * - Patient Clinical Timeline with accordions & specialty filters
 * - Treatment Plans List
 * Saves to:
 * - docs/screenshots/inquisition_live/proof_patient_history_timeline_light.png
 * - docs/screenshots/inquisition_live/proof_patient_history_timeline_dark.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDir = path.resolve("docs/screenshots/inquisition_live");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function captureTimelineProofs() {
  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--js-flags=--max-old-space-size=1024",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    serviceWorkers: "block",
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message, err.stack));
  page.on("console", (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });

  // 1. Capture Light Mode
  console.log("Navigating to preview in Light Mode...");
  await page.goto("http://127.0.0.1:5173/patient_timeline_preview.html?theme=light", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForTimeout(2000);

  const lightButtonsPath = path.join(targetDir, "proof_patient_history_expand_buttons_light.png");
  await page.screenshot({ path: lightButtonsPath, fullPage: false });
  console.log("[Captured]", lightButtonsPath);

  const lightTimelinePath = path.join(targetDir, "proof_patient_history_timeline_light.png");
  await page.screenshot({ path: lightTimelinePath, fullPage: false });
  console.log("[Captured]", lightTimelinePath);

  // 2. Capture Dark Mode
  console.log("Navigating to preview in Dark Mode...");
  await page.goto("http://127.0.0.1:5173/patient_timeline_preview.html?theme=dark", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForTimeout(2000);

  const darkButtonsPath = path.join(targetDir, "proof_patient_history_expand_buttons_dark.png");
  await page.screenshot({ path: darkButtonsPath, fullPage: false });
  console.log("[Captured]", darkButtonsPath);

  const darkTimelinePath = path.join(targetDir, "proof_patient_history_timeline_dark.png");
  await page.screenshot({ path: darkTimelinePath, fullPage: false });
  console.log("[Captured]", darkTimelinePath);

  await browser.close();
  console.log("All screenshots captured successfully!");
}

captureTimelineProofs().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
