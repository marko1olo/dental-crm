const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  console.log("[Auth] Getting tokens from /api/auth/login...");
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const data = await res.json();
  console.log("[Auth] Token received. Organization:", data.clinicToken ? "OK" : "NO");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(({ clinicToken, staffToken, user }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...user, role: "owner" }));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...user, role: "owner" }));
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user });

  const page = await context.newPage();
  console.log("[Settings] Navigating to http://127.0.0.1:5173/#settings/messengers ...");
  await page.goto("http://127.0.0.1:5173/#settings/messengers", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // Remove any tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // Click "Владелец" tab
  const ownerTabBtn = page.locator('button:has-text("Владелец")');
  if ((await ownerTabBtn.count()) > 0) {
    console.log("[Settings] Clicking 'Владелец' role tab...");
    await ownerTabBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Look for "Мессенджеры" or "Telegram" or "Боты" subnav button
  console.log("[Settings] Looking for Messengers tab...");
  const messengersBtn = page.locator('button:has-text("Мессенджеры"), button:has-text("Telegram"), button:has-text("Боты")');
  const count = await messengersBtn.count();
  console.log("[Settings] Messengers buttons count:", count);
  for (let i = 0; i < count; i++) {
    const text = await messengersBtn.nth(i).textContent();
    console.log(`  Button ${i}: "${text?.trim()}"`);
  }
  if (count > 0) {
    await messengersBtn.first().click();
    await page.waitForTimeout(2000);
  }

  const overviewCard = page.locator("[data-testid='messengers-overview-card']");
  const cardCount = await overviewCard.count();
  console.log("[Settings] MessengersOverviewCard found:", cardCount);

  const shot = path.resolve("scripts/test_real_settings_tab.png");
  await page.screenshot({ path: shot });
  console.log("[Settings] Screenshot saved:", shot);

  await browser.close();
}

main().catch(console.error);
