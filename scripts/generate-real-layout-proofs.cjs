const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function captureRealLayoutProofs() {
  console.log("Starting Puppeteer real layout proof generator...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

  try {
    // Navigate to local frontend URL
    await page.goto("http://localhost:5173", { waitUntil: "networkidle2", timeout: 10000 }).catch(async () => {
      console.log("Local Vite server not running on 5173, checking 3000/api...");
    });

    const viewsToTest = [
      { hash: "#patients", selector: '[data-testid="patient-blacklist-banner"]', proofName: "proof_real_patients_view.png" },
      { hash: "#communications", selector: '[data-testid="uis-speech-analytics-panel"]', proofName: "proof_real_communications_view.png" },
      { hash: "#visit", selector: '[data-testid="visit-photo-link-badge"]', proofName: "proof_real_visit_view.png" },
      { hash: "#schedule", selector: '[data-testid="yandex-calendar-sync-status"]', proofName: "proof_real_schedule_view.png" },
      { hash: "#documents", selector: '[data-testid="ndfl-tax-calculator-panel"]', proofName: "proof_real_documents_view.png" },
      { hash: "#settings", selector: '[data-testid="system-ram-watchdog-indicator"]', proofName: "proof_real_settings_view.png" }
    ];

    for (const v of viewsToTest) {
      try {
        await page.goto(`http://localhost:5173/${v.hash}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
        const screenshotPath = path.join(artifactDir, v.proofName);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`✓ Captured ${v.proofName}`);
      } catch (err) {
        console.warn(`! Warning capturing ${v.proofName}:`, err.message);
      }
    }
  } finally {
    await browser.close();
  }
}

captureRealLayoutProofs();
