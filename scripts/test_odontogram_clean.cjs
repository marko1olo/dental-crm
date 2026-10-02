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
      phone: "+7 (999) 888-77-66",
      allergies: ["Лидокаин"],
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-1",
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
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    sessionStorage.setItem("dente_chunk_reload_/", "1");
  });

  const page = await context.newPage();
  page.on("console", async (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || text.includes("The above error occurred") || text.includes("Maximum update depth")) {
      try {
        const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => a.toString())));
        console.log("PAGE_ERR_ARGS:", args);
      } catch {
        console.log("PAGE_ERR_FULL:", text);
      }
    }
  });
  page.on("pageerror", (err) => console.log("UNCAUGHT_ERR:", err.stack || err.message));

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

  console.log("Opening #schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("Navigating to #visit via sidebar or hash...");
  await page.evaluate(() => {
    window.location.hash = "#visit";
  });
  await page.waitForFunction(() => !!document.querySelector("#visit") || !!document.querySelector('[data-testid="visit-subtab-odontogram"]'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const status = await page.evaluate(() => {
    const v = document.querySelector("#visit");
    const subtabs = Array.from(document.querySelectorAll('[data-testid^="visit-subtab-"]')).map((b) => b.getAttribute("data-testid"));
    const header = document.querySelector('[data-testid="visit-header-monolith"]');
    return {
      visitFound: !!v,
      visitBusy: v?.getAttribute("aria-busy"),
      headerFound: !!header,
      headerText: header?.textContent?.slice(0, 150),
      subtabs,
      bodyTextSnippet: document.body.innerText.slice(0, 300),
    };
  });

  console.log("VISIT_STATUS:", JSON.stringify(status, null, 2));

  // If subtabs found, click on odontogram subtab!
  if (status.subtabs.length > 0) {
    console.log("Clicking odontogram subtab...");
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
                Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Зубная формула'));
      if (b) b.click();
    });
    await page.waitForTimeout(2000);

    const odontogramStatus = await page.evaluate(() => {
      const tb = document.querySelector(".odontogram-toolbar");
      const chart = document.querySelector(".tooth-chart-svg, [data-testid=\"odontogram-interactive-grid\"]");
      const teeth = Array.from(document.querySelectorAll('[data-tooth-id], .tooth-svg-wrapper')).map(el => el.getAttribute("data-tooth-id") || el.getAttribute("data-tooth"));
      return {
        hasToolbar: !!tb,
        hasChart: !!chart,
        teethCount: teeth.length,
        teethSample: teeth.slice(0, 10),
      };
    });
    console.log("ODONTOGRAM_STATUS:", JSON.stringify(odontogramStatus, null, 2));
  }

  await browser.close();
})();
