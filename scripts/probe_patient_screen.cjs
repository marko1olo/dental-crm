const { chromium } = require("playwright");
const path = require("node:path");

async function probe() {
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
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Set theme & tour dismissed
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

  // Remove tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  console.log("[Test] Looking for patients in list...");
  const patientRow = page.locator(".patient-item-card, [data-testid^='patient-row-'], tr.patient-row, .patient-list-card, table tbody tr").first();
  if (await patientRow.count() > 0) {
    console.log("[Test] Clicking first patient row...");
    await patientRow.click();
    await page.waitForTimeout(2000);
  }

  // Check buttons or tabs available
  const tabNames = await page.locator("button, [role='tab']").allTextContents();
  const interestingTabs = tabNames.filter(t => /зубн|одонто|прием|карт|формул/i.test(t));
  console.log("[Test] Matching clinical tabs:", interestingTabs);

  // Capture current screen
  const shotPath = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "probe_patient_screen.png");
  await page.screenshot({ path: shotPath });
  console.log("[Test] Saved probe screenshot to:", shotPath);

  await context.close();
  await browser.close();
}

probe().catch(console.error);
