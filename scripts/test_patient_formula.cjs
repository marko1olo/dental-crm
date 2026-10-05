const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("[Test] Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

  // Wait for login or main layout
  await page.waitForSelector("button:has-text('Быстрый вход в Демо-тур'), .auth-demo-btn, aside", { timeout: 30000 });

  // Set theme & dismiss tours
  await page.evaluate(() => {
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    document.documentElement.setAttribute("data-theme", "light");
  });

  const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур'), .auth-demo-btn").first();
  if (await demoBtn.count() > 0) {
    console.log("[Test] Clicking demo tour button...");
    await demoBtn.click();
    await page.waitForTimeout(1000);
    const launchBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await launchBtn.count() > 0) {
      await launchBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Remove overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // Ensure we are in Patients view
  const patientsNavBtn = page.locator("aside button:has-text('Пациенты'), [data-view='patients']").first();
  if (await patientsNavBtn.count() > 0) {
    console.log("[Test] Clicking Пациенты nav button...");
    await patientsNavBtn.click();
    await page.waitForTimeout(2000);
  }

  // Find a patient in the list
  const patientRow = page.locator("tr[data-patient-id], .patient-row, tr:has-text('Ковалёв'), tr:has-text('Иванов'), table tbody tr").first();
  if (await patientRow.count() > 0) {
    console.log("[Test] Clicking patient row...");
    await patientRow.click();
    await page.waitForTimeout(2000);
  }

  // Look for tab-segment-formula
  const formulaTab = page.locator("[data-testid='tab-segment-formula'], button:has-text('Зубная формула')").first();
  console.log("[Test] Formula tab count:", await formulaTab.count());
  if (await formulaTab.count() > 0) {
    console.log("[Test] Clicking Зубная формула tab in patient card...");
    await formulaTab.click();
    await page.waitForTimeout(2000);
  }

  const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shot = path.join(outDir, "test_patient_dental_formula.png");
  await page.screenshot({ path: shot });
  console.log("[Test] Screenshot saved:", shot);

  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
