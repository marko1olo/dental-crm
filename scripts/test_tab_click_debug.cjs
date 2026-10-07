const { chromium } = require("playwright");
const path = require("node:path");

async function debugTab() {
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const authData = await res.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ authData }) => {
    localStorage.setItem("dente_clinic_token", authData.clinicToken);
    localStorage.setItem("dente_staff_token", authData.staffToken);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...authData.user, role: "owner" }));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...authData.user, role: "owner" }));
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
  }, { authData });

  const page = await context.newPage();
  page.on("console", (msg) => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[PAGE ERROR]: ${err.message}`));

  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Remove overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  console.log("Clicking admin role button...");
  await page.locator('[data-testid="btn-settings-role-admin"]').click();
  await page.waitForTimeout(1000);

  console.log("Clicking admin-tab-messengers...");
  await page.locator('[data-testid="admin-tab-messengers"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/debug_messengers_click.png" });
  console.log("Saved scripts/debug_messengers_click.png");

  const overviewCount = await page.locator("[data-testid='messengers-overview-card']").count();
  console.log("Overview card count:", overviewCount);

  await browser.close();
}

debugTab().catch(console.error);
