import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await authRes.json();

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await context.addInitScript(
    ({ clinicToken, staffToken, user }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_session_token", staffToken);
      localStorage.setItem("dente_active_role", user.role || "doctor");
      localStorage.setItem("dente_active_user_id", user.id || "doc-1");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: user.role || "doctor",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
    },
    { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user }
  );

  const page = await context.newPage();
  page.on("console", (m) => console.log("[Console]", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("[PageError]", e.message));
  page.on("requestfailed", (r) => console.log("[ReqFailed]", r.url(), r.failure()?.errorText));
  page.on("response", (r) => {
    if (r.url().includes("/api/")) {
      console.log("[API Resp]", r.status(), r.url());
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule ...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "commit", timeout: 25000 });
  
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const txt = await page.evaluate(() => document.body ? document.body.innerText : "");
    if (!txt.includes("Загрузка системы") && txt.length > 200) {
      console.log(`Ready after ${(i+1)*500}ms!`);
      break;
    }
  }

  const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : "");
  console.log("Body text preview:", text);

  const hasMobileView = await page.locator('[data-testid="schedule-mobile-agenda-view"]').isVisible().catch(() => false);
  console.log("hasMobileView:", hasMobileView);

  const hasAddBtn = await page.locator('[data-testid="schedule-mobile-add-btn"]').isVisible().catch(() => false);
  console.log("hasAddBtn:", hasAddBtn);

  await browser.close();
}

run().catch(console.error);
