const { chromium } = require("playwright");
const path = require("node:path");

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

  console.log("[Test] Navigating...");
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

  // Click "Прием" in top bar or sidebar
  console.log("[Test] Clicking Прием button...");
  const topПриемBtn = page.locator("button:has-text('Прием')").first();
  await topПриемBtn.click();
  await page.waitForTimeout(2000);

  // Remove overlays again
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // Check subtabs
  const subtabs = await page.locator(".visit-subtab-btn, [data-testid^='visit-subtab-']").allTextContents();
  console.log("[Test] Found visit subtabs:", subtabs);

  // Click Odontogram subtab
  const odTab = page.locator("[data-testid='visit-subtab-odontogram'], button:has-text('Зубная формула')").first();
  if (await odTab.count() > 0) {
    console.log("[Test] Clicking Зубная формула tab...");
    await odTab.click();
    await page.waitForTimeout(2000);
  }

  const shot = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "probe_visit_odontogram.png");
  await page.screenshot({ path: shot });
  console.log("[Test] Saved probe screenshot:", shot);

  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
