const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function testRealAuth() {
  console.log("[Auth] Fetching real JWT tokens from Fastify API...");
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const data = await res.json();
  console.log("[Auth] API login response ok:", data.ok, "user:", data.user?.fullName);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(({ clinicToken, staffToken, user }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_role", user.role);
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: user.role,
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user });

  const page = await context.newPage();
  console.log("[Auth] Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // Remove any tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const shot = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "real_auth_app.png");
  await page.screenshot({ path: shot });
  console.log("[Auth] Saved screenshot:", shot);

  await context.close();
  await browser.close();
}

testRealAuth().catch(console.error);
