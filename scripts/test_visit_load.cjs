const { chromium } = require("playwright");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: "2026-10-02",
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        active: true,
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1",
        active: true,
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      status: "in_treatment",
      patientName: "Ковалёв Роман Станиславович",
      startTime: "2026-10-02T10:00:00.000Z",
      startsAt: "2026-10-02T10:00:00.000Z",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    sessionStorage.clear();
  });

  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("PAGE_ERR:", msg.text());
  });
  page.on("pageerror", (err) => console.log("UNCAUGHT_PAGE_ERR:", err.message));

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "audit-token-staff",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/patients/pat-1/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, states: [] }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Close any modal tour if present
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Понятно"))
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);

  const testReport = await page.evaluate(async () => {
    const elVisit = document.querySelector("#visit");
    const subtabs = Array.from(document.querySelectorAll('[data-testid^="visit-subtab-"]')).map(
      (el) => el.getAttribute("data-testid")
    );
    const hasOdontogramToolbar = !!document.querySelector(".odontogram-toolbar");
    const hasToothChart = !!document.querySelector(".tooth-chart-svg, [data-testid=\"odontogram-interactive-grid\"]");
    const headerTitle = document.querySelector('[data-testid="visit-header-monolith"]')?.textContent?.slice(0, 100);

    return {
      subtabs,
      hasOdontogramToolbar,
      hasToothChart,
      headerTitle,
      visitClass: elVisit?.className,
      visitBusy: elVisit?.getAttribute("aria-busy"),
    };
  });

  console.log("TEST_REPORT:", JSON.stringify(testReport, null, 2));

  // If subtabs exist, click on odontogram subtab!
  if (testReport.subtabs.includes("visit-subtab-odontogram")) {
    console.log("Clicking visit-subtab-odontogram...");
    await page.click('[data-testid="visit-subtab-odontogram"]');
    await page.waitForTimeout(1500);

    const afterClick = await page.evaluate(() => {
      return {
        hasOdontogramToolbar: !!document.querySelector(".odontogram-toolbar"),
        hasToothChart: !!document.querySelector(".tooth-chart-svg, .tooth-fdi-item, [data-tooth-id], [data-testid=\"odontogram-interactive-grid\"]"),
        buttons: Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()).filter(Boolean).slice(0, 30),
      };
    });
    console.log("AFTER_CLICK_REPORT:", JSON.stringify(afterClick, null, 2));
  }

  await browser.close();
})();
