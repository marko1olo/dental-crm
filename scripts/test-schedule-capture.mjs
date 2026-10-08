import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("1. Logging in via API...");
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  const auth = await loginRes.json();
  console.log("   Clinic token:", auth.clinicToken ? "OK" : "MISSING");
  console.log("   Staff token:", auth.staffToken ? "OK" : "MISSING");

  const dashRes = await fetch(`${API_BASE}/api/dashboard`, {
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": auth.clinicToken,
      "Authorization": `Bearer ${auth.staffToken}`,
    },
  });
  const dashboard = await dashRes.json();
  const doctor = (dashboard.clinicSettings?.staff || []).find((s) => s.role === "doctor") || auth.user;
  const patientId = (dashboard.patients || [])[0]?.id || "p1";

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Add cookies and storage
  await context.addCookies([
    { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (!text.includes("Download the React DevTools") && !text.includes("powerPreference")) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    }
  });
  page.on("pageerror", (err) => console.error(`[BROWSER PAGEERROR] ${err.message}`));

  await page.addInitScript(({ cToken, sToken, pId, doc }) => {
    localStorage.setItem("dente_clinic_token", cToken);
    localStorage.setItem("dente_staff_token", sToken);
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      selectedSpecialty: "therapist",
      selectedPatientId: pId,
      onboardingDismissed: true,
    }));
  }, { cToken: auth.clinicToken, sToken: auth.staffToken, pId: patientId, doc: doctor });

  console.log("2. Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  console.log("3. Waiting for .schedule-filter-strip to be visible...");
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  console.log("   FOUND .schedule-filter-strip!");

  console.log("4. Waiting for schedule cards or grid...");
  await wait(2000);
  const cardCount = await page.locator('[data-testid="appointment-card"], [data-testid^="appointment-card-"]').count();
  console.log(`   Found ${cardCount} appointment cards!`);

  await page.screenshot({ path: "docs/screenshots/red_team/test_schedule_pc.png" });
  console.log("   Saved test screenshot to docs/screenshots/red_team/test_schedule_pc.png");

  await browser.close();
  console.log("DONE!");
}

main().catch(console.error);
