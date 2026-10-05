const { chromium } = require("playwright");
const path = require("node:path");

async function checkPatients() {
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const data = await res.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

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
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click Пациенты in sidebar
  const patBtn = page.locator("aside button:has-text('Пациенты'), [data-view='patients']").first();
  await patBtn.click();
  await page.waitForTimeout(2000);

  const shot = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "real_patients_view.png");
  await page.screenshot({ path: shot });
  console.log("[Patients] Saved screenshot:", shot);

  await context.close();
  await browser.close();
}

checkPatients().catch(console.error);
