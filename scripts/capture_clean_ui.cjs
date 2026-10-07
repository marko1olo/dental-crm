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

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[PAGE ERROR]:", msg.text());
    }
  });

  // ----------------------------------------------------
  // 1. SCREENSHOT 1: AppointmentModal (Clean)
  // ----------------------------------------------------
  console.log("Navigating to doctor_autonomy_preview.html for AppointmentModal...");
  await page.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html", {
    waitUntil: "commit",
    timeout: 45000,
  });

  console.log("Waiting for doctor_autonomy_preview app to mount...");
  await page.waitForSelector('[data-testid="tab-schedule-modal"]', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Make sure '1. Экспресс-запись' is active
  const tabAppt = await page.$('[data-testid="tab-schedule-modal"]');
  if (tabAppt) {
    await tabAppt.click();
    await page.waitForTimeout(1500);
  }

  const apptModalPath = path.resolve(__dirname, "../screenshot-appointment-modal-clean.png");
  await page.screenshot({ path: apptModalPath });
  console.log("Screenshot 1 captured:", apptModalPath);

  // ----------------------------------------------------
  // 2. SCREENSHOT 2: Visit Note Draft / Protocol ("✓ Норма")
  // ----------------------------------------------------
  console.log("Switching to '2. Норма ЭМК' tab...");
  const tabEmk = await page.waitForSelector('[data-testid="tab-emk-toolbar"]', { timeout: 10000 });
  await tabEmk.click();
  await page.waitForTimeout(1500);

  // Click "Норма" button to fill protocol with physiological norm
  const normBtn = await page.$('button:has-text("Норма")');
  if (normBtn) {
    await normBtn.click();
    await page.waitForTimeout(1000);
  }

  const visitNotePath = path.resolve(__dirname, "../screenshot-visit-note-norma-clean.png");
  await page.screenshot({ path: visitNotePath });
  console.log("Screenshot 2 captured:", visitNotePath);

  // ----------------------------------------------------
  // 3. SCREENSHOT 3: Payment Capture / Cashier (Clean)
  // ----------------------------------------------------
  console.log("Navigating to payment_modal_preview.html for PaymentModal...");
  await page.goto("http://127.0.0.1:5173/payment_modal_preview.html", {
    waitUntil: "commit",
    timeout: 45000,
  });

  console.log("Waiting for payment_modal_preview app to mount...");
  await page.waitForSelector('.payment-modal, [data-testid="payment-modal-studio"]', { timeout: 30000 });
  await page.waitForTimeout(2000);

  const paymentCapturePath = path.resolve(__dirname, "../screenshot-payment-capture-clean.png");
  await page.screenshot({ path: paymentCapturePath });
  console.log("Screenshot 3 captured:", paymentCapturePath);

  await browser.close();
  console.log("SUCCESS: All 3 clean screenshots captured!");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
