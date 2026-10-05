const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function probe() {
  console.log("[Probe] Launching Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("[Probe] Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

  console.log("[Probe] Waiting for boot state to dismiss or login button...");
  await page.waitForSelector("button:has-text('Быстрый вход в Демо-тур'), .auth-demo-btn, .auth-hub-container, aside", { timeout: 30000 });
  console.log("[Probe] Login or layout loaded!");

  // Dismiss tours and set theme
  await page.evaluate(() => {
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    document.documentElement.setAttribute("data-theme", "light");
  });

  const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур'), .auth-demo-btn").first();
  if (await demoBtn.count() > 0) {
    console.log("[Probe] Clicking demo tour button...");
    await demoBtn.click();
    await page.waitForTimeout(1000);

    const launchBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур'), button:has-text('Начать тур')").first();
    if (await launchBtn.count() > 0) {
      console.log("[Probe] Clicking launch demo tour button...");
      await launchBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Remove tour spotlight overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  console.log("[Probe] Checking current view and buttons...");
  const buttons = await page.locator("aside button, nav button").allTextContents();
  console.log("[Probe] Sidebar/nav buttons:", buttons.slice(0, 10));

  // Navigate to Visit view
  const visitSidebarBtn = page.locator("aside button:has-text('Прием'), aside button:has-text('Карта и дневник'), [data-view='visit'], nav button:has-text('Прием')").first();
  if (await visitSidebarBtn.count() > 0) {
    console.log("[Probe] Clicking Visit sidebar button...");
    await visitSidebarBtn.click();
    await page.waitForTimeout(2000);
  }

  // Look for Odontogram subtab
  const odontogramSubtab = page.locator("[data-testid='visit-subtab-odontogram'], button:has-text('Зубная формула')").first();
  console.log("[Probe] Odontogram subtab count:", await odontogramSubtab.count());
  if (await odontogramSubtab.count() > 0) {
    console.log("[Probe] Clicking Odontogram subtab...");
    await odontogramSubtab.click();
    await page.waitForTimeout(2000);
  }

  const odontogramContainer = page.locator("[data-testid='odontogram-view-container'], .odontogram-view-container");
  console.log("[Probe] Odontogram container count:", await odontogramContainer.count());

  const probeShot = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "probe_dental_chart.png");
  await page.screenshot({ path: probeShot });
  console.log("[Probe] Saved probe screenshot:", probeShot);

  await context.close();
  await browser.close();
}

probe().catch((err) => {
  console.error("[Probe] Error:", err);
  process.exit(1);
});
