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
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: {
      mode: "small_clinic",
      title: "Оптимальный режим",
      fitScore: 100,
      blockers: [],
      upgrades: [],
      lowFrictionNextStep: "ready",
    },
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
      allergies: ["Лидокаин"],
      notes: "Бронхиальная астма, анафилаксия на лидокаин",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    {
      id: "app-2",
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
      serviceTitle: "Эндодонтия 46 зуба (3 канала)",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  payments: [],
  patientStats: { total: 1, active: 1, newThisMonth: 1, retainedPct: 100 },
  inventoryMetrics: { itemsCount: 42, lowStockCount: 0, criticalCount: 0, expiredCount: 0 },
  marketingStats: { totalLeads: 0, conversionRate: 0 },
  pendingLabOrders: [],
  todayOperations: {
    appointmentsCount: 1,
    inChairCount: 1,
    completedCount: 0,
    cancelledCount: 0,
    waitingRoomCount: 0,
    noShowCount: 0,
    revenueTodayKopecks: 0,
    debtTotalKopecks: 0,
    criticalSanpinAlertsCount: 0,
    unprintedFiscalReceipts: 0,
    unacknowledgedSmsCount: 0,
    unsigned043CardsCount: 0,
    missingContractsCount: 0,
    sterilizationBatchesDue: 0,
    overdueLabTasksCount: 0,
    lowStockReagentsCount: 0,
    postVisitInstructions: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function getActiveBaseUrl() {
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
      if (res.ok) return `http://127.0.0.1:${port}`;
    } catch {}
  }
  return "http://127.0.0.1:5173";
}

async function captureProof() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const baseUrl = await getActiveBaseUrl();
  console.log(`[Playwright] Target Vite Base URL: ${baseUrl}`);

  console.log("[Playwright] Launching Chrome...");
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
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
          flags: { disableTour: true },
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
        body: JSON.stringify({ success: true, token: "live-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });

  console.log(`Navigating to ${baseUrl}/#schedule ...`);
  await page.goto(`${baseUrl}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  console.log("Navigating to #visit ...");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"], [data-testid="visit-emk-tab"]', { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Remove any tour overlay if present
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Click EMK subtab if not active
  const emkTab = page.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), [data-testid="visit-subtab-emk"]').first();
  if (await emkTab.isVisible()) {
    console.log("Activating EMK tab...");
    await emkTab.click({ force: true });
    await page.waitForTimeout(1000);
  }

  // Click 1-Click Physiological Norm to fill realistic clinical Form 043/U data
  const normBtn = page.locator('[data-testid="btn-somatic-norm-quick"], button:has-text("Физиологическая норма"), button:has-text("Норма")').first();
  if (await normBtn.isVisible()) {
    console.log("Applying 1-click clinical norm for proof demonstration...");
    await normBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Light Theme
  console.log("Configuring Light theme...");
  await page.evaluate(() => {
    localStorage.setItem("dente_theme_mode", "light");
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("light");
    }
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(1000);

  const lightFile = path.join(outDir, "proof_emk_canvas_rebuild_light.png");
  await page.screenshot({ path: lightFile, fullPage: false, animations: "disabled" });
  console.log(`Saved Light proof: ${lightFile} (${fs.statSync(lightFile).size} bytes)`);

  // Dark Theme
  console.log("Configuring Dark theme...");
  await page.evaluate(() => {
    localStorage.setItem("dente_theme_mode", "dark");
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("dark");
    }
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(1000);

  const darkFile = path.join(outDir, "proof_emk_canvas_rebuild_dark.png");
  await page.screenshot({ path: darkFile, fullPage: false, animations: "disabled" });
  console.log(`Saved Dark proof: ${darkFile} (${fs.statSync(darkFile).size} bytes)`);

  await browser.close();
  console.log("EMK proof capture completed successfully!");
}

captureProof().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
