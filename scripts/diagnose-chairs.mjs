import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  const auth = await loginRes.json();

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

  await context.addCookies([
    { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[PAGE ERROR] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => console.error(`[UNCAUGHT ERROR] ${err.stack || err.message}`));

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

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  await page.waitForSelector('[data-testid="schedule-toolbar"]', { state: "visible", timeout: 35000 });
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Подготовка модулей расписания") &&
           !text.includes("Загрузка системы") &&
           !text.includes("Загрузка рабочей смены");
  }, { timeout: 30000 });

  console.log("Schedule loaded! Now clicking chairs view button...");
  const chairsBtn = page.locator('[data-testid="schedule-view-mode-chairs"]').first();
  console.log("Chairs btn visible?", await chairsBtn.isVisible());
  await chairsBtn.click();
  await wait(2000);

  console.log("Body text after clicking chairs:", (await page.evaluate(() => document.body.innerText)).slice(0, 400));
  await page.screenshot({ path: "docs/screenshots/red_team/diag_chairs.png" });

  await browser.close();
}

main().catch(console.error);
