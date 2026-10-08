/**
 * scripts/capture_patient_finance_deposit_screenshots.cjs
 * Subagent 4 (Patient Card & Finance Deposit Inquisitor)
 * Capture PC Light (1440x900) & PC Dark (1440x900) screenshots of PatientCardModal with Finance Deposit tab.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const dir1 = path.resolve(__dirname, "../apps/web/public/screenshots/patient_finance");
  const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\6456ba35-1ac0-42dd-96c8-e81fe35a7792";
  
  fs.mkdirSync(dir1, { recursive: true });
  try {
    fs.mkdirSync(brainDir, { recursive: true });
  } catch (e) {
    console.log("Brain dir fallback note:", e.message);
  }

  console.log(">>> Launching Chromium for Patient Finance Deposit Visual Capture...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // ─── 1. PC LIGHT (1440x900) ───
    console.log(">>> Navigating to Patient Finance Deposit Preview (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/patient_finance_deposit_preview.html?theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="patient-card-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="patient-balance-card"]', { visible: true, timeout: 10000 });
    await page.waitForTimeout(600);

    const lightPath1 = path.join(dir1, "patient_card_finance_deposit_light.png");
    const lightPathBrain = path.join(brainDir, "patient_card_finance_deposit_light.png");
    await page.screenshot({ path: lightPath1, fullPage: false });
    try {
      fs.copyFileSync(lightPath1, lightPathBrain);
    } catch (e) {
      console.log("Copy to brain dir skipped:", e.message);
    }
    console.log(`>>> Captured PC Light screenshot: ${lightPath1} (${fs.statSync(lightPath1).size} bytes)`);

    // ─── 2. PC DARK (1440x900) ───
    console.log(">>> Navigating to Patient Finance Deposit Preview (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/patient_finance_deposit_preview.html?theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="patient-card-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="patient-balance-card"]', { visible: true, timeout: 10000 });
    await page.waitForTimeout(600);

    const darkPath1 = path.join(dir1, "patient_card_finance_deposit_dark.png");
    const darkPathBrain = path.join(brainDir, "patient_card_finance_deposit_dark.png");
    await page.screenshot({ path: darkPath1, fullPage: false });
    try {
      fs.copyFileSync(darkPath1, darkPathBrain);
    } catch (e) {
      console.log("Copy to brain dir skipped:", e.message);
    }
    console.log(`>>> Captured PC Dark screenshot: ${darkPath1} (${fs.statSync(darkPath1).size} bytes)`);

    console.log(">>> All screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing screenshots:", err);
  process.exit(1);
});
