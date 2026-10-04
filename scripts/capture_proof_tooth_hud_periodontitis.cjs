const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
    doctorLoads: [],
    assistantLoads: [],
    chairLoads: [],
    roleQueues: [],
    scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.ru",
      notes: "Бронхиальная астма",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Эндодонтия 16 зуба (периодонтит)",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  documents: [],
  payments: [],
  billingSummary: { totalPlannedRub: 12500, totalDueRub: 12500, totalPaidRub: 0 },
};

async function run() {
  const docsDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(docsDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_auth_token", "live-inquisition-token");
    localStorage.setItem(
      "dental-crm:onboarding-state:v1",
      JSON.stringify({ completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
          flags: { disableTour: true, hasPediatricMode: true },
        },
      })
    );
  });

  const page = await context.newPage();

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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "live-inquisition-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, teethData: [] }),
    });
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  console.log("Navigating to Visit view...");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"]', { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  console.log("Switching to Odontogram subtab...");
  await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { state: "visible", timeout: 15000 });
  await page.click('[data-testid="visit-subtab-odontogram"]');
  await page.waitForTimeout(1500);

  await page.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);

  async function applyTheme(th) {
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme_mode", theme);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(theme);
      }
      document.documentElement.setAttribute("data-theme", theme);
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, th);
    await page.waitForTimeout(600);
  }

  async function openAndCaptureHud(themeName, outFileName) {
    await applyTheme(themeName);

    // Hover over tooth 16 to trigger HUD
    const tooth16 = await page.$('[data-tooth-id="16"]');
    if (tooth16) {
      await tooth16.hover();
      await page.waitForTimeout(200);
    }

    // Force display of HUD so it stays rock-solid for screenshot
    await page.evaluate(() => {
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      if (hud) {
        hud.classList.remove("hidden");
        hud.style.display = "flex";
        hud.style.visibility = "visible";
        hud.style.opacity = "1";
        hud.style.zIndex = "999";
      }
    });
    await page.waitForTimeout(500);

    const outPath = path.join(docsDir, outFileName);
    await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
    const stats = fs.statSync(outPath);
    console.log(`[Captured] ${outFileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // 1. LIGHT THEME
  console.log("Capturing Light Theme HUD Proof...");
  await openAndCaptureHud("light", "proof_tooth_hud_periodontitis_light.png");

  // 2. DARK THEME
  console.log("Capturing Dark Theme HUD Proof...");
  await openAndCaptureHud("dark", "proof_tooth_hud_periodontitis_dark.png");

  await browser.close();
  console.log("All proof screenshots successfully captured!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
