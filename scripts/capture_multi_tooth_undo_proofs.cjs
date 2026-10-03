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
        specialties: ["therapist", "surgeon", "implantologist"],
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
        name: "Кабинет 1 (Терапия/Хирургия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
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
    doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      notes: "Терапевтический приём: мульти-зубное лечение (Зуб 16, Зуб 17).",
      allergies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:30",
      status: "in_progress",
      type: "treatment",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
      reason: "Лечение кариеса 16 (MOD) и острого пульпита 17",
      diagnosisTooth: "16, 17",
    },
  ],
  activeVisit: {
    id: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    status: "in_progress",
  },
  documents: [],
  payments: [],
  billingSummary: { totalPlannedRub: 18500, totalPaidRub: 18500, totalDueRub: 0, draftDocumentAmountRub: 0, taxDeductionEligibleRub: 18500, openTreatmentItems: 2, unpaidDocuments: 0, totalDiscountRub: 0, familyBalanceRub: 0 },
  clinicalMetrics: { activeTreatmentPlans: 1, unscheduledFollowUps: 0, pendingInformedConsents: 0, prescriptionsIssuedThisMonth: 1, postVisitInstructions: 1 },
  importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function captureMultiToothUndoProofs() {
  console.log("Launching Chromium...");
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
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
    } catch {}
    sessionStorage.setItem("dente:sw-controller-reload", "1");
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", onboardingDraftMode: false, version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", onboardingDraftMode: false, version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        selectedAppointmentId: "app-1",
        selectedSpecialty: "therapist",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true },
        },
      })
    );

    // Suppress tour spotlight overlay
    const style = document.createElement("style");
    style.id = "dente-tour-suppress";
    style.textContent = `
      .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="guided-tour-coach-mark-card"], [data-testid="guided-tour-pulsing-halo-anchor"] {
        display: none !important;
        pointer-events: none !important;
      }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[BROWSER ERROR]", msg.text());
  });

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
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
        body: JSON.stringify({ success: true, token: "mock-staff-token-67890", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/patients/pat-1/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, toothStates: { "16": "treatment", "17": "treatment" } }),
      });
    }
    if (url.includes("/api/patients/pat-1/treatment-plans")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, plans: [] }) });
    }
    if (url.includes("/draft/autosave")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, savedAt: new Date().toISOString() }) });
    }
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  // Switch to visit view with pat-1 and app-1 active
  console.log("Activating visit with pat-1 and app-1...");
  await page.evaluate(() => {
    if (window.__usePatientStore) window.__usePatientStore.getState().setSelectedPatientId("pat-1");
    if (window.__useAppStore) {
      window.__useAppStore.getState().setSelectedAppointmentId?.("app-1");
      window.__useAppStore.getState().setCurrentView("visit");
    }
    window.location.hash = "visit";
  });

  // Wait for Suspense to finish loading VisitView
  console.log("Waiting for Suspense lazy loading to resolve...");
  await page.waitForSelector('[aria-label="Текущий прием"][aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Check if VisitView mounted
  const visitSelector = '[data-testid="visit-view"], .visit-monolithic-header, [data-testid="visit-header-monolith"], .visit-subtab-btn';
  await page.locator(visitSelector).first().waitFor({ state: "visible", timeout: 30000 }).catch(async () => {
    console.log("VisitView not visible yet, trying to click appointment in schedule...");
    const appCard = page.locator('.appointment-card, [data-testid="appointment-card"], .schedule-appointment-card').first();
    if (await appCard.isVisible()) {
      await appCard.click({ force: true });
      await page.waitForTimeout(2000);
    }
  });

  console.log("VisitView mounted! Injecting multi-tooth treatment & undo snapshot history...");

  // Populate multi-tooth treatment data and populate Undo stack
  await page.evaluate(() => {
    const store = window.__useVisitStore;
    if (store) {
      // 0. Base state
      store.setState({
        visitNoteForm: {
          complaint: "Осмотр полости рта",
          objectiveStatus: "Зубной ряд интактен.",
          diagnosis: "Z01.2 Стоматологическое обследование",
        },
        visitToothStateByCode: {},
        visitToothRecordsByCode: {},
        activeToothNumber: 16,
      });

      // 1. Snapshot 1
      store.getState().pushVisitSnapshot("Первичный осмотр");

      // 2. Treat Tooth 16 (Caries MOD)
      store.getState().setToothState("16", "treatment");
      store.getState().setVisitToothRecord("16", {
        toothNumber: 16,
        state: "treatment",
        diagnosis: "K02.1 Кариес дентина (MOD)",
        diagnosisIcd10: "K02.1",
        cavity: "MOD",
        surfaces: ["M", "O", "D"],
        material: "Световой композит Filtek Z250",
        anesthesia: "Sol. Ultracaini D-S 1:200 000 — 1.7 мл",
      });
      store.getState().pushVisitSnapshot("Лечение зуба 16: Кариес MOD");

      // 3. Treat Tooth 17 (Pulpitis)
      store.getState().setToothState("17", "treatment");
      store.getState().setVisitToothRecord("17", {
        toothNumber: 17,
        state: "treatment",
        diagnosis: "K04.0 Острый пульпит",
        diagnosisIcd10: "K04.0",
        preparationFormula: "MB1, MB2, DB, P",
      });
      store.getState().pushVisitSnapshot("Лечение зуба 17: Острый пульпит");

      // 4. Update visitNoteForm with sanitized merged multi-tooth entries
      store.setState((prev) => ({
        visitNoteForm: {
          ...prev.visitNoteForm,
          complaint: "Зуб 16: боли от термических раздражителей (холодное/сладкое), быстро проходящие после устранения причины.\nЗуб 17: острые самопроизвольные приступообразные ночные боли, иррадиирующие в висок.",
          objectiveStatus: "Зуб 16: глубокая кариозная полость на окклюзионной и контактных поверхностях (MOD). Зондирование болезненно по эмалево-дентинной границе.\n\nЗуб 17: глубокая кариозная полость, полость зуба вскрыта, зондирование устьев каналов резко болезненно, пульпа обильно кровоточит.",
          diagnosis: "[Зуб 16: K02.1 Кариес дентина (MOD)]; [Зуб 17: K04.0 Острый пульпит]",
          treatmentPlan: "Зуб 16: препарирование полости (MOD), антисептическая обработка, пломбирование светоотверждаемым композитом Filtek Z250, шлифовка, полировка.\n\nЗуб 17: анестезия Sol. Ultracaini D-S 1.7 мл, раскрытие полости, экстирпация пульпы, обработка каналов MB1, MB2, DB, P системой ProTaper Gold, Calasept.",
          recommendations: "1. Воздержаться от приема пищи в течение 2 часов.\n2. При болях: Нимесулид 100 мг 1 таб.\n3. Повторный приём через 3 дня для постоянной обтурации каналов зуба 17.",
        },
      }));
    }
  });

  // Switch to ЭМК subtab
  const emkBtn = page.locator('button:has-text("ЭМК"), .visit-subtab-btn:has-text("ЭМК")').first();
  if (await emkBtn.isVisible()) {
    console.log("Clicking ЭМК subtab...");
    await emkBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  await page.waitForTimeout(1000);

  const outDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(outDir, { recursive: true });

  // Zoomed Toolbar Capture (Undo & Redo buttons)
  const undoBtn = page.locator('[data-testid="btn-visit-undo"]').first();
  if (await undoBtn.isVisible()) {
    console.log("Undo button is visible!");
    const toolbar = page.locator('[data-testid="btn-visit-undo"]').locator("xpath=../..").first();
    const toolbarLightPath = path.join(outDir, "proof_emk_toolbar_undo_buttons_light.png");
    await toolbar.screenshot({ path: toolbarLightPath });
    console.log("Saved toolbar light screenshot:", toolbarLightPath);
  }

  // Diagnosis Section with Multi-Tooth format
  const diagTextarea = page.locator('textarea').filter({ hasText: "Зуб 16" }).first();
  if (await diagTextarea.isVisible()) {
    await diagTextarea.scrollIntoViewIfNeeded();
  }

  // Light Full View
  const lightPath = path.join(outDir, "proof_multi_tooth_visit_undo_light.png");
  await page.screenshot({ path: lightPath, fullPage: false });
  console.log("Saved light screenshot:", lightPath);

  // Switch to Dark Mode
  await page.evaluate(() => {
    localStorage.setItem("dente_theme_mode", "dark");
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("dark");
    }
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(800);

  // Zoomed Toolbar Capture in Dark Mode
  if (await undoBtn.isVisible()) {
    const toolbar = page.locator('[data-testid="btn-visit-undo"]').locator("xpath=../..").first();
    const toolbarDarkPath = path.join(outDir, "proof_emk_toolbar_undo_buttons_dark.png");
    await toolbar.screenshot({ path: toolbarDarkPath });
    console.log("Saved toolbar dark screenshot:", toolbarDarkPath);
  }

  // Dark Full View
  const darkPath = path.join(outDir, "proof_multi_tooth_visit_undo_dark.png");
  await page.screenshot({ path: darkPath, fullPage: false });
  console.log("Saved dark screenshot:", darkPath);

  // Open Clinical Modal for Tooth 16 to capture cavity classification pills
  console.log("Opening clinical tooth modal for tooth 16...");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente-open-tooth-clinical-modal", { detail: { code: "16" } }));
  });
  await page.waitForTimeout(600);

  const modalLight = page.locator('._ccm-content, [role="dialog"]').first();
  if (await modalLight.isVisible()) {
    const modalPath = path.join(outDir, "proof_clinical_modal_cavity_buttons_dark.png");
    await modalLight.screenshot({ path: modalPath });
    console.log("Saved clinical modal cavity screenshot:", modalPath);
  }

  await browser.close();
  console.log("Screenshots captured successfully!");
}

captureMultiToothUndoProofs().catch((e) => {
  console.error("Screenshot capture failed:", e);
  process.exit(1);
});
