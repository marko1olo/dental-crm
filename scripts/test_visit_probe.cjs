const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function probe() {
  console.log("1. Authenticating with API...");
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await loginRes.json();
  console.log("Logged in:", auth.ok, auth.user?.fullName);

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(({ clinicToken, staffToken, user }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user });

  const page = await context.newPage();
  console.log("2. Navigating to http://127.0.0.1:5173/#visit ...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(3000);

  // Clean overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container').forEach(el => el.remove());
  });

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log("Body preview:\n", bodyText);

  const hasBillingWidget = await page.locator('[data-testid="visit-service-billing-widget"]').count();
  console.log("Has visit-service-billing-widget:", hasBillingWidget);

  const outDir = path.resolve("docs/screenshots/billing_and_summary_redesign");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: path.join(outDir, "probe_screen.png") });
  console.log("Saved probe_screen.png");

  await browser.close();
}

probe().catch(console.error);
