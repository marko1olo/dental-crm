const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  path.resolve("docs/screenshots/audit_7sins"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      clinicName: "Стоматология ДЕНТЕ Премиум",
      timezone: "Europe/Moscow",
      mode: "clinic",
      activeSpecialties: ["therapy", "orthopedics", "surgery", "orthodontics", "pediatric", "periodontics"],
    },
    staff: [
      {
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        fullName: "Д-р Соколова Мария Игоревна",
        role: "doctor",
        specialties: ["surgeon"],
        active: true,
        color: "#6366f1",
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
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 2 (Хирургия)",
        room: "2",
        defaultDoctorId: "doc-2",
        active: true,
        hasXraySensor: false,
        hasMicroscope: false,
        hasSurgeryKit: true,
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
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Иванов Алексей Сергеевич",
      status: "active",
      birthDate: "1992-08-24",
      phone: "+7 (916) 123-45-67",
      email: "ivanov@example.ru",
      notes: "Здоров",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Елена Васильевна",
      status: "active",
      birthDate: "1995-11-15",
      phone: "+7 (925) 555-44-33",
      email: "smirnova@example.ru",
      notes: "Чувствительность эмали",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Петров Сергей Николаевич",
      status: "active",
      birthDate: "1980-02-10",
      phone: "+7 (903) 777-11-22",
      email: "petrov@example.ru",
      notes: "Сложное удаление",
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
      patientId: "pat-2",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "completed",
      state: "completed",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T06:00:00.000Z`,
      endsAt: `${todayDate}T07:00:00.000Z`,
      startTime: `${todayDate}T06:00:00.000Z`,
      endTime: `${todayDate}T07:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Терапия: Лечение кариеса",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Иванов Алексей Сергеевич",
      doctorName: "Д-р Воронов А.В.",
    },
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
    {
      id: "app-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "confirmed",
      state: "confirmed",
      priority: "normal",
      intent: "consultation",
      startsAt: `${todayDate}T12:30:00.000Z`,
      endsAt: `${todayDate}T13:30:00.000Z`,
      startTime: `${todayDate}T12:30:00.000Z`,
      endTime: `${todayDate}T13:30:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Первичная консультация + профгигиена",
      serviceCategories: ["hygiene", "therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Смирнова Елена Васильевна",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "app-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-4",
      doctorUserId: "doc-2",
      doctorId: "doc-2",
      chairId: "chair-2",
      status: "planned",
      state: "planned",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T07:00:00.000Z`,
      endsAt: `${todayDate}T08:30:00.000Z`,
      startTime: `${todayDate}T07:00:00.000Z`,
      endTime: `${todayDate}T08:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Атипичное удаление 38 зуба",
      serviceCategories: ["surgery"],
      createdByUserId: "doc-2",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Петров Сергей Николаевич",
      doctorName: "Д-р Соколова М.И.",
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: null,
  visitCloseChecklist: { visitId: "v-none", readyToSign: false, score: 0, nextAction: "none", blockingItems: 0, items: [] },
  documents: [],
  imagingStudies: [],
  protocolTemplates: [],
  serviceCatalog: [],
  treatmentPlanItems: [],
  treatmentPlanScenarios: [],
  clinicalRules: [],
  clinicalRuleEvaluations: [],
  clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
  payments: [],
  billingSummary: { totalPlannedRub: 12500, totalDiscountRub: 0, totalPaidRub: 12500, totalDueRub: 0, taxDeductionEligibleRub: 12500, draftDocumentAmountRub: 0, openTreatmentItems: 1, unpaidDocuments: 0 },
  communicationTemplates: [],
  communicationTasks: [],
  communicationEvents: [],
  communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 },
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
      localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
      localStorage.setItem("dente_active_user_id", "doc-1");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
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
          body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Dismiss onboarding strip to free full vertical screen height
    const dismissBtn = page.locator('button:has-text("Скрыть")');
    if (await dismissBtn.isVisible()) {
      console.log("Dismissing onboarding strip...");
      await dismissBtn.click();
      await page.waitForTimeout(400);
    }

    // =========================================================================
    // 1. Single-chair Split-Shift View: Morning 08:00-14:00 & Evening 14:00-20:00
    // Select chair-1 by clicking its chip in filter strip
    // =========================================================================
    const chair1Badge = page.locator('[data-testid="chair-view-badge-chair-1"]');
    if (await chair1Badge.isVisible()) {
      console.log("Clicking chair-1 filter to activate single-chair split-shift day view...");
      await chair1Badge.click();
      await page.waitForTimeout(600);
    }

    // Verify split track is visible
    await page.waitForSelector('[data-testid="schedule-split-day-track"]', { state: "visible", timeout: 10000 });
    console.log("Split-shift day track is active!");

    // Capture Light Desktop (01_schedule_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "01_schedule_desktop_light.png");

    // Capture Dark Desktop (02_schedule_desktop_dark.png)
    await setTheme(page, "dark");
    await saveProof(page, "02_schedule_desktop_dark.png");

    // =========================================================================
    // 2. Multi-Chair Panoramic Matrix View: All clinic chairs side by side
    // Deselect chair-1 by clicking its chip again or clicking "Все записи"
    // =========================================================================
    console.log("Switching to multi-chair panoramic view...");
    if (await chair1Badge.isVisible()) {
      await chair1Badge.click(); // toggle off chair filter to show all chairs
      await page.waitForTimeout(600);
    }

    // Switch to "chairs" view mode button or check if multiple chairs are rendered
    const chairsModeBtn = page.locator('[data-testid="schedule-view-mode-chairs"]');
    if (await chairsModeBtn.isVisible()) {
      console.log("Activating 'chairs' view mode...");
      await chairsModeBtn.click();
      await page.waitForTimeout(600);
    }

    // Capture Multi-Chair Dark (45_schedule_chairs_desktop_dark.png)
    await saveProof(page, "45_schedule_chairs_desktop_dark.png");

    // Capture Multi-Chair Light (44_schedule_chairs_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "44_schedule_chairs_desktop_light.png");

    console.log("All schedule visual proofs successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
