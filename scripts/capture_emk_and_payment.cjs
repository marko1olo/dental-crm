const { launchSafeBrowser } = require("./safe_playwright.cjs");
const path = require("node:path");

async function main() {
  const browser = await launchSafeBrowser({
    headless: true,
    viewport: { width: 1440, height: 900 },
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // ----------------------------------------------------
  // 2. SCREENSHOT 2: Visit Note Draft / Protocol ("✓ Норма")
  // ----------------------------------------------------
  console.log("Navigating to doctor_autonomy_preview.html?view=emk_toolbar...");
  await page.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=emk_toolbar", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // Click the "✓ Норма" button in EmkToolbar to populate physiological norm
  console.log("Clicking '✓ Норма' in toolbar...");
  const normBtn = await page.waitForSelector('button:has-text("Норма")', { timeout: 10000 });
  await normBtn.click();
  await page.waitForTimeout(1000);

  const visitNotePath = path.resolve(__dirname, "../screenshot-visit-note-norma-clean.png");
  await page.screenshot({ path: visitNotePath });
  console.log("Screenshot 2 captured successfully:", visitNotePath);

  // ----------------------------------------------------
  // 3. SCREENSHOT 3: Payment Capture / Cashier (Clean)
  // ----------------------------------------------------
  console.log("Navigating to payment_modal_preview.html...");
  await page.goto("http://127.0.0.1:5173/payment_modal_preview.html", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  const paymentCapturePath = path.resolve(__dirname, "../screenshot-payment-capture-clean.png");
  await page.screenshot({ path: paymentCapturePath });
  console.log("Screenshot 3 captured successfully:", paymentCapturePath);

  await browser.close();
  console.log("ALL SCREENSHOTS COMPLETED!");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
