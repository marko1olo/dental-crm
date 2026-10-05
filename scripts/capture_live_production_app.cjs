const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_DIR = path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e99ad5c9-e8e6-4b58-825a-9029fbbeb880");
const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");

async function main() {
  console.log("[Playwright] Launching Chrome to inspect live production app...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  // 1. Desktop PC 1440x900
  const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pcPage = await pcContext.newPage();

  console.log("[Playwright] Navigating to http://127.0.0.1:5173/ ...");
  await pcPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for boot-state to disappear
  console.log("[Playwright] Waiting for boot-state to detach...");
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch((e) => console.log("Boot state note:", e.message));

  await pcPage.waitForTimeout(3000);

  const pcLiveShot = path.join(OUT_DIR, "proof_live_app_pc_main.png");
  await pcPage.screenshot({ path: pcLiveShot, fullPage: false });
  fs.copyFileSync(pcLiveShot, path.join(BRAIN_DIR, "proof_live_app_pc_main.png"));
  console.log("[Playwright] Saved:", pcLiveShot);

  // Try clicking "Пациенты" or equivalent
  const patientsBtn = pcPage.locator("button:has-text('Пациенты'), a:has-text('Пациенты')").first();
  if (await patientsBtn.count() > 0) {
    console.log("[Playwright] Clicking Patients navigation button...");
    await patientsBtn.click();
    await pcPage.waitForTimeout(2000);
    const pcPatientsShot = path.join(OUT_DIR, "proof_live_app_pc_patients.png");
    await pcPage.screenshot({ path: pcPatientsShot, fullPage: false });
    fs.copyFileSync(pcPatientsShot, path.join(BRAIN_DIR, "proof_live_app_pc_patients.png"));
    console.log("[Playwright] Saved Patients view:", pcPatientsShot);
  }

  await pcContext.close();
  await browser.close();
}

main().catch((err) => {
  console.error("Error in live app capture:", err);
  process.exit(1);
});
