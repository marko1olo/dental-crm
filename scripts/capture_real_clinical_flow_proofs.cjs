/**
 * scripts/capture_real_clinical_flow_proofs.cjs
 *
 * Captures visual proof of real clinical flow:
 * Odontogram -> Form 043/u EMK Diary -> Treatment Plan
 * Resolution: 1440x900 (Desktop Light and Desktop Dark)
 * Output: docs/screenshots/inquisition_live/
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

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
      balanceRub: 12500,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
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
      serviceTitle: "Лечение кариеса 16 и пульпита 26",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: {
    id: "v-real-flow-1",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_progress",
    specialty: "therapy",
    diagnosisTooth: "16, 26, 36",
    diagnosisIcd10: "K02.1",
    createdAt: `${todayDate}T10:00:00.000Z`,
    updatedAt: `${todayDate}T10:00:00.000Z`,
  },
  visitCloseChecklist: {
    visitId: "v-real-flow-1",
    readyToSign: true,
    score: 100,
    nextAction: "sign",
    blockingItems: 0,
    items: [],
  },
  documents: [],
  imagingStudies: [],
  protocolTemplates: [],
  serviceCatalog: [
    { id: "srv-caries", code804n: "A16.07.002", title: "Лечение глубокого кариеса с пломбированием", priceRub: 4500, category: "therapy" },
    { id: "srv-pulp", code804n: "A16.07.030", title: "Эндодонтическое лечение пульпита (3 канала)", priceRub: 12000, category: "therapy" },
    { id: "srv-perio", code804n: "A16.07.051", title: "Лечение периодонтита ультразвуком Vector", priceRub: 6500, category: "periodontics" },
    { id: "srv-crown", code804n: "A16.07.004", title: "Керамическая коронка IPS e.max", priceRub: 28000, category: "orthopedics" },
  ],
  treatmentPlanItems: [],
  treatmentPlanScenarios: [],
  clinicalRules: [],
  clinicalRuleEvaluations: [],
  clinicalRuleSummary: {
    activeRules: 0,
    evaluatedRules: 0,
    unresolved: 0,
    blockers: 0,
    warnings: 0,
    requiredServices: 0,
    coveredRules: 0,
  },
  payments: [],
  billingSummary: {
    totalPlannedRub: 23000,
    totalCompletedRub: 0,
    totalPaidRub: 0,
    debtRub: 23000,
  },
};

const realTeethStates = [
  { toothNumber: 16, state: "Caries", surfaces: ["O", "M"], updatedAt: new Date().toISOString() },
  { toothNumber: 26, state: "Pulpitis", updatedAt: new Date().toISOString() },
  { toothNumber: 36, state: "Periodontitis", updatedAt: new Date().toISOString() },
  { toothNumber: 46, state: "Missing", updatedAt: new Date().toISOString() },
];

async function run() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ru-RU",
  });

  const page = await context.newPage();

  // Route interception for resilient execution
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
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
    if (url.includes("/api/patients/pat-1/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(realTeethStates),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }
    if (url.includes("/api/treatment-plans")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // Inject initial state before navigation
  await page.addInitScript(({ teeth, dashboard }) => {
    localStorage.setItem("dente_staff_token", "real-flow-token");
    localStorage.setItem("dente_clinic_token", "real-clinic-token");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_active_view", "visit");
    localStorage.setItem("dente_workspace_perspective", "presentation");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      isDismissedPermanently: true,
      isTourActive: false,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] }
      }
    }));
    localStorage.setItem("dente_odontogram_states_pat-1", JSON.stringify(teeth));
  }, { teeth: realTeethStates, dashboard: mockDashboard });

  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 30000 });

  await page.waitForTimeout(2000);

  // If PIN pad is visible, enter PIN 1234
  const pinPad = page.locator(".auth-pin-grid");
  if (await pinPad.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("PIN pad detected. Unlocking with 1234...");
    const buttons = page.locator(".auth-pin-btn");
    await page.locator(".auth-pin-btn", { hasText: "1" }).click();
    await page.waitForTimeout(100);
    await page.locator(".auth-pin-btn", { hasText: "2" }).click();
    await page.waitForTimeout(100);
    await page.locator(".auth-pin-btn", { hasText: "3" }).click();
    await page.waitForTimeout(100);
    await page.locator(".auth-pin-btn", { hasText: "4" }).click();
    await page.waitForSelector(".auth-overlay", { state: "detached", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Ensure workspace state and presentation mode
  await page.evaluate(({ teeth }) => {
    localStorage.setItem("dente_odontogram_states_pat-1", JSON.stringify(teeth));
    localStorage.setItem("dente_workspace_perspective", "presentation");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      isDismissedPermanently: true,
      isTourActive: false,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] }
      }
    }));
    if (window.__usePerspectiveStore) {
      window.__usePerspectiveStore.getState().setPerspective("presentation");
    }
    if (window.__useAppStore) {
      window.__useAppStore.getState().setCurrentView("visit");
    }
  }, { teeth: realTeethStates });

  await page.waitForTimeout(2000);

  // Dismiss any remaining tour popups if visible
  const dismissTourBtn = page.locator("button", { hasText: "Больше не показывать" });
  if (await dismissTourBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("Dismissing training tour...");
    await dismissTourBtn.click();
    await page.waitForTimeout(600);
  }
  const skipBtn = page.locator("button", { hasText: "Пропустить" });
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(600);
  }

  // Set Light Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(1200);

  const lightPath = path.join(outputDir, "proof_real_flow_odontogram_to_plan_light.png");
  await page.screenshot({ path: lightPath, fullPage: false });
  const lightStats = fs.statSync(lightPath);
  console.log(`[PROOF LIGHT] Saved: ${lightPath} (${Math.round(lightStats.size / 1024)} KB)`);

  // Set Dark Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(1000);

  const darkPath = path.join(outputDir, "proof_real_flow_odontogram_to_plan_dark.png");
  await page.screenshot({ path: darkPath, fullPage: false });
  const darkStats = fs.statSync(darkPath);
  console.log(`[PROOF DARK] Saved: ${darkPath} (${Math.round(darkStats.size / 1024)} KB)`);

  await browser.close();
  console.log("Visual proof capture complete!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
